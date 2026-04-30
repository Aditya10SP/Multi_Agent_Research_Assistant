import json
import logging
from typing import Dict
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class CriticAgent:
    """Reviews research quality and identifies gaps"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "critic"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Analyze all gathered data for quality and completeness"""
        from datetime import datetime
        
        # Log input state
        input_snapshot = {
            "num_document_summaries": len(state.get("document_summaries", [])),
            "num_web_results": len(state.get("web_results", [])),
            "num_paper_results": len(state.get("paper_results", [])),
            "sub_questions": state["plan"]["sub_questions"] if state.get("plan") else [],
            "retry_count": state.get("retry_count", 0)
        }
        
        state["current_node"] = self.name
        state["status"] = "critiquing"
        
        execution_log = {
            "node": self.name,
            "started_at": datetime.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None,
            "quality_calculations": {}
        }
        
        try:
            logger.info(f"Critic starting for job {state['job_id']}")
            
            # Load prompt template
            with open("prompts/critic_prompt.txt", "r") as f:
                prompt_template = f.read()
            
            # Format summaries for prompt
            summaries_text = "\n\n".join([
                f"Source: {s['source']}\nSummary: {s['summary']}\nKey Points: {', '.join(s['key_points'])}"
                for s in state["document_summaries"][:10]
            ])
            
            # Format prompt
            prompt = prompt_template.format(
                question=state["question"],
                sub_questions=", ".join(state["plan"]["sub_questions"]),
                num_sources=len(state["web_results"]) + len(state["paper_results"]),
                summaries=summaries_text
            )
            
            execution_log["prompt_sent"] = prompt[:500] + "..." if len(prompt) > 500 else prompt
            
            # Call LLM
            response = self.llm.invoke(prompt)
            
            # Extract JSON from response (handle cases where LLM adds extra text)
            content = response.content.strip()
            execution_log["raw_llm_response"] = content[:1000] + "..." if len(content) > 1000 else content
            
            # Try to find JSON in the response
            if content.startswith("```json"):
                content = content.split("```json")[1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[1].split("```")[0].strip()
            
            feedback_raw = json.loads(content)
            
            # Calculate quality scores
            coverage_score = self._calculate_coverage(state)
            source_quality = self._calculate_source_quality(state)
            overall_quality = (coverage_score + source_quality) / 2
            
            execution_log["quality_calculations"] = {
                "coverage_score": coverage_score,
                "source_quality": source_quality,
                "overall_quality": overall_quality,
                "calculation_method": "average of coverage and source quality"
            }
            
            # Determine if retry is needed
            retry_needed = (
                overall_quality < 0.6 and 
                state["retry_count"] < 1 and
                len(feedback_raw.get("gaps", [])) > 0
            )
            
            feedback = {
                "gaps": feedback_raw.get("gaps", []),
                "contradictions": feedback_raw.get("contradictions", []),
                "quality_score": overall_quality,
                "source_credibility": source_quality,
                "retry_needed": retry_needed,
                "retry_queries": feedback_raw.get("retry_queries", []) if retry_needed else []
            }
            
            state["critic_feedback"] = feedback
            
            # Log output
            execution_log["output"] = {
                "feedback": feedback,
                "decision": "retry" if retry_needed else "proceed",
                "num_gaps": len(feedback["gaps"]),
                "num_contradictions": len(feedback.get("contradictions", []))
            }
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Critic evaluation: quality={overall_quality:.2f}, retry={retry_needed}")
            
        except Exception as e:
            logger.error(f"Critic failed: {str(e)}")
            state["error_log"].append(f"Critic: {str(e)}")
            # Set default feedback to continue workflow
            state["critic_feedback"] = {
                "gaps": [],
                "contradictions": [],
                "quality_score": 0.7,
                "source_credibility": 0.7,
                "retry_needed": False,
                "retry_queries": []
            }
            execution_log["error"] = str(e)
            execution_log["completed_at"] = datetime.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
    
    def _calculate_coverage(self, state: ResearchState) -> float:
        """Calculate how well summaries cover sub-questions"""
        if not state["document_summaries"]:
            return 0.0
        
        # Simple heuristic: ratio of summaries to sub-questions
        coverage = min(len(state["document_summaries"]) / len(state["plan"]["sub_questions"]), 1.0)
        return coverage
    
    def _calculate_source_quality(self, state: ResearchState) -> float:
        """Assess overall source quality"""
        if not state["web_results"] and not state["paper_results"]:
            return 0.0
        
        total_score = 0.0
        total_sources = 0
        
        # Papers get high credibility
        for paper in state["paper_results"]:
            total_score += 0.9
            total_sources += 1
        
        # Web sources get medium credibility
        for web in state["web_results"]:
            domain = web.get("source", "")
            if any(trusted in domain for trusted in ["edu", "gov", "wikipedia"]):
                total_score += 0.9
            else:
                total_score += 0.6
            total_sources += 1
        
        return total_score / total_sources if total_sources > 0 else 0.0
