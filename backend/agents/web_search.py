import logging
import time
import random
from typing import List, Dict
from datetime import datetime
from langchain_groq import ChatGroq
from graph.state import ResearchState
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import json
from duckduckgo_search import DDGS
import os

logger = logging.getLogger(__name__)

class WebSearchAgent:
    """Performs web searches for each sub-question"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "web_search"
        self.session = requests.Session()
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        self.tavily_api_key = os.getenv('TAVILY_API_KEY')
        self.use_tavily = bool(self.tavily_api_key and self.tavily_api_key != 'xxx')
        
        if self.use_tavily:
            logger.info("Using Tavily API for web search")
        else:
            logger.info("Using DuckDuckGo for web search (Tavily API key not configured)")
    
    def _tavily_search(self, query: str, num_results: int = 5) -> List[Dict]:
        """Search using Tavily API"""
        try:
            from tavily import TavilyClient
            
            logger.info(f"Searching Tavily for: {query}")
            
            client = TavilyClient(api_key=self.tavily_api_key)
            response = client.search(query, max_results=num_results)
            
            results = []
            for result in response.get('results', []):
                results.append({
                    'href': result.get('url', ''),
                    'title': result.get('title', 'No title'),
                    'body': result.get('content', '')
                })
            
            logger.info(f"✓ Found {len(results)} Tavily search results")
            return results
            
        except Exception as e:
            logger.error(f"Tavily search failed: {str(e)}")
            return []
    
    
    def _search_with_llm_knowledge(self, query: str, num_results: int = 5) -> List[Dict]:
        """Use LLM to generate informative search results based on its knowledge"""
        try:
            logger.info(f"Using LLM knowledge base for: {query}")
            
            prompt = f"""You are a research assistant with access to comprehensive knowledge. For the query: "{query}"

Provide {num_results} informative responses as if they were from reputable sources. For each:
1. Create a realistic source URL (use domains like wikipedia.org, britannica.com, nature.com, sciencedirect.com, nih.gov, nasa.gov, etc.)
2. Write a descriptive title
3. Write 3-4 sentences with ACTUAL FACTUAL INFORMATION you know about this topic

Be informative and accurate. Use your knowledge to provide real information.

Format as:
---
URL: [realistic url]
TITLE: [descriptive title]
CONTENT: [3-4 informative sentences with facts]
---"""
            
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            
            # Parse the response
            results = []
            entries = content.split('---')
            
            for entry in entries:
                if not entry.strip():
                    continue
                
                lines = entry.strip().split('\n')
                url = ""
                title = ""
                description = ""
                
                current_field = None
                for line in lines:
                    line = line.strip()
                    if line.startswith('URL:'):
                        url = line.replace('URL:', '').strip()
                        current_field = 'url'
                    elif line.startswith('TITLE:'):
                        title = line.replace('TITLE:', '').strip()
                        current_field = 'title'
                    elif line.startswith('CONTENT:'):
                        description = line.replace('CONTENT:', '').strip()
                        current_field = 'content'
                    elif current_field == 'content' and line:
                        description += " " + line
                
                if url and title and description:
                    results.append({
                        "href": url,
                        "title": title,
                        "body": description.strip()
                    })
            
            if results:
                logger.info(f"✓ Generated {len(results)} knowledge-based results")
                return results[:num_results]
            else:
                logger.warning("Failed to parse LLM response, using fallback")
                return self._create_fallback_results(query, num_results)
                
        except Exception as e:
            logger.error(f"LLM knowledge search failed: {str(e)}")
            return self._create_fallback_results(query, num_results)
    
    def _create_fallback_results(self, query: str, num_results: int) -> List[Dict]:
        """Create basic fallback results with common sources"""
        logger.info(f"Creating fallback results for: {query}")
        
        # Extract key terms from query
        key_terms = query.replace('?', '').replace('What', '').replace('How', '').replace('Why', '').strip()
        search_term = quote_plus(key_terms)
        
        results = [
            {
                "href": f"https://en.wikipedia.org/wiki/{key_terms.replace(' ', '_')}",
                "title": f"{key_terms} - Wikipedia",
                "body": f"Wikipedia article providing comprehensive information about {key_terms.lower()}, including history, current research, and related topics."
            },
            {
                "href": f"https://www.britannica.com/search?query={search_term}",
                "title": f"{key_terms} | Britannica",
                "body": f"Encyclopedia Britannica entry covering the fundamental concepts, theories, and scientific understanding of {key_terms.lower()}."
            },
            {
                "href": f"https://scholar.google.com/scholar?q={search_term}",
                "title": f"Research papers on {key_terms}",
                "body": f"Academic research and peer-reviewed papers discussing {key_terms.lower()}, including recent discoveries and theoretical frameworks."
            },
            {
                "href": f"https://www.sciencedirect.com/search?qs={search_term}",
                "title": f"Scientific articles about {key_terms}",
                "body": f"Collection of scientific articles and research publications exploring various aspects of {key_terms.lower()}."
            },
            {
                "href": f"https://www.nature.com/search?q={search_term}",
                "title": f"{key_terms} - Nature",
                "body": f"Nature journal articles and research papers on {key_terms.lower()}, featuring cutting-edge scientific discoveries."
            }
        ]
        
        return results[:num_results]
    
    def _google_search(self, query: str, num_results: int = 5) -> List[Dict]:
        """Search using DuckDuckGo API with retry logic"""
        max_retries = 3
        base_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Searching DuckDuckGo for: {query} (attempt {attempt + 1}/{max_retries})")
                
                # Add delay between requests to avoid rate limiting
                if attempt > 0:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    logger.info(f"Waiting {delay}s before retry...")
                    time.sleep(delay)
                
                # Use duckduckgo-search library with html backend (more reliable)
                with DDGS() as ddgs:
                    results = []
                    search_results = ddgs.text(query, max_results=num_results, backend='html')
                    
                    for result in search_results:
                        results.append({
                            'href': result.get('href', result.get('link', '')),
                            'title': result.get('title', 'No title'),
                            'body': result.get('body', result.get('snippet', ''))
                        })
                
                logger.info(f"✓ Found {len(results)} DuckDuckGo search results")
                return results
                
            except Exception as e:
                error_msg = str(e)
                if 'Ratelimit' in error_msg or '202' in error_msg:
                    logger.warning(f"Rate limited on attempt {attempt + 1}, will retry...")
                    if attempt == max_retries - 1:
                        logger.error(f"DuckDuckGo search failed after {max_retries} attempts: {error_msg}")
                else:
                    logger.error(f"DuckDuckGo search failed: {error_msg}")
                    break
        
        return []
    
    def _scrape_content(self, url: str) -> str:
        """Scrape content from a URL"""
        try:
            headers = {
                'User-Agent': random.choice(self.user_agents)
            }
            
            response = self.session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(['script', 'style', 'nav', 'footer', 'header']):
                script.decompose()
            
            # Get text
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Return first 500 characters
            return text[:500] if text else ""
            
        except Exception as e:
            logger.error(f"Failed to scrape {url}: {str(e)}")
            return ""
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Search web for each sub-question in plan"""
        from datetime import datetime as dt
        
        # Log input state
        input_snapshot = {
            "sub_questions": state["plan"]["sub_questions"] if state.get("plan") else [],
            "depth": state["depth"],
            "retry_count": state["retry_count"]
        }
        
        state["current_node"] = self.name
        state["status"] = "searching"
        
        execution_log = {
            "node": self.name,
            "started_at": dt.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None,
            "search_details": []
        }
        
        try:
            logger.info(f"Web search starting for job {state['job_id']}")
            
            results = []
            seen_urls = set()
            max_results_per_query = 5 if state["depth"] == "deep" else 3
            
            # Search for each sub-question
            for i, sub_question in enumerate(state["plan"]["sub_questions"]):
                search_detail = {
                    "query": sub_question,
                    "results_found": 0,
                    "error": None,
                    "method": "duckduckgo"
                }
                
                # Add delay between queries to avoid rate limiting
                if i > 0:
                    time.sleep(random.uniform(2, 4))
                
                try:
                    # Use Tavily if available, otherwise DuckDuckGo
                    if self.use_tavily:
                        search_results_list = self._tavily_search(sub_question, max_results_per_query)
                        search_detail["method"] = "tavily"
                    else:
                        search_results_list = self._google_search(sub_question, max_results_per_query)
                        search_detail["method"] = "duckduckgo"
                    
                    search_detail["results_found"] = len(search_results_list)
                    
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
                        
                        # Get snippet from search result or scrape if empty
                        snippet = result.get("body", "")
                        if not snippet or len(snippet) < 50:
                            logger.info(f"Scraping content from: {url}")
                            scraped_content = self._scrape_content(url)
                            if scraped_content:
                                snippet = scraped_content
                        
                        results.append({
                            "url": url,
                            "title": result.get("title", "No title"),
                            "snippet": snippet,
                            "source": source,
                            "query": sub_question,
                            "timestamp": datetime.utcnow().isoformat(),
                            "search_method": search_detail["method"]
                        })
                
                except Exception as e:
                    error_msg = str(e)
                    search_detail["error"] = error_msg
                    logger.error(f"Search failed for: {sub_question}, error: {error_msg}")
                    state["error_log"].append(f"Web search for '{sub_question}': {error_msg}")
                finally:
                    execution_log["search_details"].append(search_detail)
            
            state["web_results"] = results
            
            # Log output
            execution_log["output"] = {
                "total_results": len(results),
                "unique_sources": len(seen_urls),
                "queries_executed": len(state["plan"]["sub_questions"]),
                "sample_results": results[:3] if results else [],
                "methods_used": ["tavily" if self.use_tavily else "duckduckgo"]
            }
            execution_log["completed_at"] = dt.utcnow().isoformat()
            
            logger.info(f"Found {len(results)} total web results across all queries")
            
            if len(results) == 0:
                logger.error("CRITICAL: No web results found")
                state["error_log"].append("Web search returned 0 results")
            else:
                logger.info(f"✓ Successfully gathered {len(results)} results using {'Tavily' if self.use_tavily else 'DuckDuckGo'}")
            
        except Exception as e:
            logger.error(f"Web search agent failed: {str(e)}")
            state["error_log"].append(f"Web search: {str(e)}")
            execution_log["error"] = str(e)
            execution_log["completed_at"] = dt.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
