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
        state["current_node"] = self.name
        state["status"] = "reading"
        
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
                    
                    summaries.append({
                        "source": web_result["url"],
                        "source_type": "web",
                        "summary": content[:500],
                        "key_points": key_points[:5],
                        "word_count": len(content.split())
                    })
                
                except Exception as e:
                    logger.error(f"Failed to process web result: {str(e)}")
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
                    
                    summaries.append({
                        "source": paper_result["url"],
                        "source_type": "paper",
                        "summary": abstract[:500],
                        "key_points": key_points[:5],
                        "word_count": len(abstract.split())
                    })
                
                except Exception as e:
                    logger.error(f"Failed to process paper: {str(e)}")
                    continue
            
            state["document_summaries"] = summaries
            logger.info(f"Generated {len(summaries)} document summaries")
            
        except Exception as e:
            logger.error(f"Document reader failed: {str(e)}")
            state["error_log"].append(f"Document reader: {str(e)}")
        
        return state
