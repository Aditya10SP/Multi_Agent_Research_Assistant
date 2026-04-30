import logging
from typing import List, Dict
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class DocumentReaderAgent:
    """Reads and summarizes documents from various sources"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "document_reader"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Read and summarize all documents"""
        from datetime import datetime
        
        # Log input state
        input_snapshot = {
            "num_web_results": len(state.get("web_results", [])),
            "num_paper_results": len(state.get("paper_results", [])),
            "total_sources": len(state.get("web_results", [])) + len(state.get("paper_results", []))
        }
        
        state["current_node"] = self.name
        state["status"] = "reading"
        
        execution_log = {
            "node": self.name,
            "started_at": datetime.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None,
            "processing_details": []
        }
        
        try:
            logger.info(f"Document reader starting for job {state['job_id']}")
            
            summaries = []
            
            # Process web results (use snippets as content)
            for web_result in state["web_results"][:10]:  # Limit to 10 sources
                try:
                    content = web_result.get("snippet", "")
                    if not content:
                        continue
                    
                    # Extract key points using LLM
                    prompt = f"Extract 3-5 key points from this text:\n\n{content}"
                    response = self.llm.invoke(prompt)
                    key_points = [line.strip("- ").strip() for line in response.content.split("\n") if line.strip()]
                    
                    summary_entry = {
                        "source": web_result["url"],
                        "source_type": "web",
                        "summary": content[:500],
                        "key_points": key_points[:5],
                        "word_count": len(content.split())
                    }
                    summaries.append(summary_entry)
                    
                    execution_log["processing_details"].append({
                        "source": web_result["url"],
                        "type": "web",
                        "key_points_extracted": len(key_points[:5]),
                        "success": True
                    })
                
                except Exception as e:
                    logger.error(f"Failed to process web result: {str(e)}")
                    execution_log["processing_details"].append({
                        "source": web_result.get("url", "unknown"),
                        "type": "web",
                        "error": str(e),
                        "success": False
                    })
                    continue
            
            # Process paper abstracts
            for paper_result in state["paper_results"][:10]:  # Limit to 10 papers
                try:
                    abstract = paper_result.get("abstract", "")
                    if not abstract:
                        continue
                    
                    # Extract key points
                    prompt = f"Extract 3-5 key points from this abstract:\n\n{abstract}"
                    response = self.llm.invoke(prompt)
                    key_points = [line.strip("- ").strip() for line in response.content.split("\n") if line.strip()]
                    
                    summary_entry = {
                        "source": paper_result["url"],
                        "source_type": "paper",
                        "summary": abstract[:500],
                        "key_points": key_points[:5],
                        "word_count": len(abstract.split())
                    }
                    summaries.append(summary_entry)
                    
                    execution_log["processing_details"].append({
                        "source": paper_result["title"],
                        "type": "paper",
                        "key_points_extracted": len(key_points[:5]),
                        "success": True
                    })
                
                except Exception as e:
                    logger.error(f"Failed to process paper: {str(e)}")
                    execution_log["processing_details"].append({
                        "source": paper_result.get("title", "unknown"),
                        "type": "paper",
                        "error": str(e),
                        "success": False
                    })
                    continue
            
            state["document_summaries"] = summaries
            
            # Log output
            execution_log["output"] = {
                "total_summaries": len(summaries),
                "web_summaries": len([s for s in summaries if s["source_type"] == "web"]),
                "paper_summaries": len([s for s in summaries if s["source_type"] == "paper"]),
                "total_key_points": sum(len(s["key_points"]) for s in summaries),
                "sample_summary": summaries[0] if summaries else None
            }
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Generated {len(summaries)} document summaries")
            
        except Exception as e:
            logger.error(f"Document reader failed: {str(e)}")
            state["error_log"].append(f"Document reader: {str(e)}")
            execution_log["error"] = str(e)
            execution_log["completed_at"] = datetime.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
