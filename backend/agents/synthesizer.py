import json
import logging
from typing import Dict, List
from datetime import datetime
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class SynthesisAgent:
    """Generates final structured research report"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "synthesizer"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Synthesize all data into final report"""
        from datetime import datetime as dt
        
        # Log input state
        input_snapshot = {
            "num_document_summaries": len(state.get("document_summaries", [])),
            "num_web_results": len(state.get("web_results", [])),
            "num_paper_results": len(state.get("paper_results", [])),
            "quality_score": state.get("critic_feedback", {}).get("quality_score", 0),
            "question": state["question"]
        }
        
        state["current_node"] = self.name
        state["status"] = "synthesizing"
        
        execution_log = {
            "node": self.name,
            "started_at": dt.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None
        }
        
        try:
            logger.info(f"Synthesizer starting for job {state['job_id']}")
            
            # Load prompt template
            with open("prompts/synthesis_prompt.txt", "r") as f:
                prompt_template = f.read()
            
            # Format summaries
            formatted_summaries = "\n\n".join([
                f"Source: {s['source']}\nType: {s['source_type']}\nSummary: {s['summary']}\nKey Points:\n" + 
                "\n".join(f"- {kp}" for kp in s['key_points'])
                for s in state["document_summaries"]
            ])
            
            # Format prompt
            prompt = prompt_template.format(
                question=state["question"],
                num_web_results=len(state["web_results"]),
                num_papers=len(state["paper_results"]),
                num_summaries=len(state["document_summaries"]),
                formatted_summaries=formatted_summaries
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
            
            report_data = json.loads(content)
            
            # Format references
            references = self._format_references(state)
            
            # Create final report
            report = {
                "summary": report_data.get("summary", ""),
                "key_findings": report_data.get("key_findings", []),
                "supporting_evidence": self._compile_evidence(report_data.get("key_findings", []), state),
                "limitations": report_data.get("limitations", []),
                "references": references,
                "metadata": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "total_sources": len(references),
                    "research_depth": state["depth"],
                    "quality_score": state["critic_feedback"]["quality_score"]
                }
            }
            
            state["final_report"] = report
            state["status"] = "complete"
            
            # Log output
            execution_log["output"] = {
                "num_key_findings": len(report["key_findings"]),
                "num_references": len(references),
                "num_limitations": len(report["limitations"]),
                "summary_length": len(report["summary"]),
                "report_metadata": report["metadata"]
            }
            execution_log["completed_at"] = dt.utcnow().isoformat()
            
            logger.info(f"Report generated with {len(report['key_findings'])} findings")
            
        except Exception as e:
            logger.error(f"Synthesizer failed: {str(e)}")
            state["error_log"].append(f"Synthesizer: {str(e)}")
            state["status"] = "failed"
            execution_log["error"] = str(e)
            execution_log["completed_at"] = dt.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
    
    def _format_references(self, state: ResearchState) -> List[Dict]:
        """Create formatted citation list"""
        references = []
        
        # Add paper references
        for paper in state["paper_results"]:
            references.append({
                "id": paper["arxiv_id"],
                "title": paper["title"],
                "authors": paper["authors"],
                "url": paper["url"],
                "source_type": "paper",
                "accessed_date": datetime.utcnow().isoformat()
            })
        
        # Add web references
        for web in state["web_results"]:
            references.append({
                "id": web["url"],
                "title": web["title"],
                "authors": [],
                "url": web["url"],
                "source_type": "web",
                "accessed_date": datetime.utcnow().isoformat()
            })
        
        return references
    
    def _compile_evidence(self, findings: List[Dict], state: ResearchState) -> List[Dict]:
        """Link findings to specific source excerpts"""
        evidence_list = []
        
        for finding_id, finding in enumerate(findings):
            citations = finding.get("citations", [])
            
            for citation_url in citations[:3]:  # Limit to 3 citations per finding
                # Find matching summary
                matching_summary = next(
                    (s for s in state["document_summaries"] if s["source"] == citation_url),
                    None
                )
                
                if matching_summary:
                    evidence_list.append({
                        "finding_id": finding_id,
                        "source": matching_summary["source"],
                        "excerpt": matching_summary["summary"][:200],
                        "url": citation_url
                    })
        
        return evidence_list
