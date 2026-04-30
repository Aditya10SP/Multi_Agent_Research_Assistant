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
        state["current_node"] = self.name
        
        try:
            logger.info(f"Paper search starting for job {state['job_id']}")
            
            results = []
            seen_arxiv_ids = set()
            max_papers_per_query = 5 if state["depth"] == "deep" else 3
            
            # Search ArXiv for each sub-question
            for sub_question in state["plan"]["sub_questions"]:
                try:
                    search = arxiv.Search(
                        query=sub_question,
                        max_results=max_papers_per_query,
                        sort_by=arxiv.SortCriterion.Relevance
                    )
                    
                    for paper in search.results():
                        arxiv_id = paper.entry_id.split('/')[-1]
                        
                        if arxiv_id in seen_arxiv_ids:
                            continue
                        
                        seen_arxiv_ids.add(arxiv_id)
                        
                        results.append({
                            "title": paper.title,
                            "authors": [author.name for author in paper.authors],
                            "abstract": paper.summary,
                            "arxiv_id": arxiv_id,
                            "url": paper.entry_id,
                            "published_date": paper.published.isoformat(),
                            "categories": paper.categories
                        })
                
                except Exception as e:
                    logger.error(f"ArXiv search failed for: {sub_question}, error: {str(e)}")
                    state["error_log"].append(f"Paper search error: {str(e)}")
                    continue
            
            state["paper_results"] = results
            logger.info(f"Found {len(results)} papers")
            
        except Exception as e:
            logger.error(f"Paper search agent failed: {str(e)}")
            state["error_log"].append(f"Paper search: {str(e)}")
        
        return state
