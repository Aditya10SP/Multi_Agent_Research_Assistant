import logging
from typing import List, Dict
from datetime import datetime
from duckduckgo_search import DDGS
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class WebSearchAgent:
    """Performs web searches for each sub-question"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "web_search"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Search web for each sub-question in plan"""
        state["current_node"] = self.name
        state["status"] = "searching"
        
        try:
            logger.info(f"Web search starting for job {state['job_id']}")
            
            results = []
            seen_urls = set()
            max_results_per_query = 5 if state["depth"] == "deep" else 3
            
            # Search for each sub-question
            for i, sub_question in enumerate(state["plan"]["sub_questions"]):
                try:
                    # Add delay between requests to avoid rate limiting
                    if i > 0:
                        import time
                        time.sleep(2)  # 2 second delay between queries
                    
                    logger.info(f"Searching web for: {sub_question}")
                    
                    # Use DDGS with timeout
                    ddgs = DDGS(timeout=20)
                    search_results = ddgs.text(sub_question, max_results=max_results_per_query)
                    
                    # Convert generator to list
                    search_results_list = list(search_results) if search_results else []
                    
                    logger.info(f"Got {len(search_results_list)} results for: {sub_question}")
                    
                    for result in search_results_list:
                        url = result.get("href", "")
                        
                        if not url or url in seen_urls:
                            continue
                        
                        seen_urls.add(url)
                        
                        # Extract domain as source
                        try:
                            source = url.split("//")[-1].split("/")[0]
                        except:
                            source = url
                        
                        results.append({
                            "url": url,
                            "title": result.get("title", "No title"),
                            "snippet": result.get("body", "No description"),
                            "source": source,
                            "query": sub_question,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Search failed for: {sub_question}, error: {error_msg}")
                    state["error_log"].append(f"Web search for '{sub_question}': {error_msg}")
                    
                    # If rate limited, log but continue
                    if "ratelimit" in error_msg.lower() or "202" in error_msg:
                        logger.warning(f"Rate limited on query {i+1}, continuing with other queries")
                    continue
            
            state["web_results"] = results
            logger.info(f"Found {len(results)} total web results across all queries")
            
            if len(results) == 0:
                logger.warning("No web results found - may be rate limited or no matches")
                state["error_log"].append("Web search returned 0 results (possibly rate limited)")
            
        except Exception as e:
            logger.error(f"Web search agent failed: {str(e)}")
            state["error_log"].append(f"Web search: {str(e)}")
        
        return state
