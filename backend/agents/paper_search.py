import logging
from typing import List, Dict
import arxiv
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class PaperSearchAgent:
    """Searches ArXiv for academic papers"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "paper_search"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Query ArXiv for each sub-question"""
        from datetime import datetime
        
        # Log input state
        input_snapshot = {
            "sub_questions": state["plan"]["sub_questions"] if state.get("plan") else [],
            "depth": state["depth"],
            "max_papers_per_query": 5 if state["depth"] == "deep" else 3
        }
        
        state["current_node"] = self.name
        
        execution_log = {
            "node": self.name,
            "started_at": datetime.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None,
            "search_details": []
        }
        
        try:
            logger.info(f"Paper search starting for job {state['job_id']}")
            
            results = []
            seen_arxiv_ids = set()
            max_papers_per_query = 5 if state["depth"] == "deep" else 3
            
            # Search ArXiv for each sub-question
            for sub_question in state["plan"]["sub_questions"]:
                search_detail = {
                    "query": sub_question,
                    "papers_found": 0,
                    "error": None
                }
                
                try:
                    search = arxiv.Search(
                        query=sub_question,
                        max_results=max_papers_per_query,
                        sort_by=arxiv.SortCriterion.Relevance
                    )
                    
                    papers_for_query = 0
                    for paper in search.results():
                        arxiv_id = paper.entry_id.split('/')[-1]
                        
                        if arxiv_id in seen_arxiv_ids:
                            continue
                        
                        seen_arxiv_ids.add(arxiv_id)
                        papers_for_query += 1
                        
                        results.append({
                            "title": paper.title,
                            "authors": [author.name for author in paper.authors],
                            "abstract": paper.summary,
                            "arxiv_id": arxiv_id,
                            "url": paper.entry_id,
                            "published_date": paper.published.isoformat(),
                            "categories": paper.categories
                        })
                    
                    search_detail["papers_found"] = papers_for_query
                
                except Exception as e:
                    search_detail["error"] = str(e)
                    logger.error(f"ArXiv search failed for: {sub_question}, error: {str(e)}")
                    state["error_log"].append(f"Paper search error: {str(e)}")
                finally:
                    execution_log["search_details"].append(search_detail)
            
            state["paper_results"] = results
            
            # Log output
            execution_log["output"] = {
                "total_papers": len(results),
                "unique_papers": len(seen_arxiv_ids),
                "queries_executed": len(state["plan"]["sub_questions"]),
                "sample_papers": [
                    {"title": p["title"], "arxiv_id": p["arxiv_id"]} 
                    for p in results[:3]
                ] if results else []
            }
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Found {len(results)} papers")
            
        except Exception as e:
            logger.error(f"Paper search agent failed: {str(e)}")
            state["error_log"].append(f"Paper search: {str(e)}")
            execution_log["error"] = str(e)
            execution_log["completed_at"] = datetime.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
