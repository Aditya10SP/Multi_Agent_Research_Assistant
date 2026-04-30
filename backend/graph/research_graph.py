import logging
from typing import Dict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_groq import ChatGroq
from graph.state import ResearchState
from agents.planner import PlannerAgent
from agents.web_search import WebSearchAgent
from agents.paper_search import PaperSearchAgent
from agents.document_reader import DocumentReaderAgent
from agents.critic import CriticAgent
from agents.synthesizer import SynthesisAgent

logger = logging.getLogger(__name__)

def build_research_graph(groq_api_key: str, checkpoint_db: str = "data/checkpoints.db") -> StateGraph:
    """Construct LangGraph workflow with conditional routing"""
    
    # Initialize LLMs
    llm_heavy = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3, api_key=groq_api_key)
    llm_fast = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1, api_key=groq_api_key)
    
    # Initialize agents
    planner = PlannerAgent(llm_heavy)
    web_search = WebSearchAgent(llm_fast)
    paper_search = PaperSearchAgent(llm_fast)
    document_reader = DocumentReaderAgent(llm_fast)
    critic = CriticAgent(llm_heavy)
    synthesizer = SynthesisAgent(llm_heavy)
    
    # Initialize graph
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("planner", planner.execute)
    workflow.add_node("web_search", web_search.execute)
    workflow.add_node("paper_search", paper_search.execute)
    workflow.add_node("document_reader", document_reader.execute)
    workflow.add_node("critic", critic.execute)
    workflow.add_node("synthesizer", synthesizer.execute)
    
    # Set entry point
    workflow.set_entry_point("planner")
    
    # Add edges - sequential execution to avoid concurrent state updates
    workflow.add_edge("planner", "web_search")
    workflow.add_edge("web_search", "paper_search")
    workflow.add_edge("paper_search", "document_reader")
    workflow.add_edge("document_reader", "critic")
    
    # Conditional routing from critic
    def route_after_critic(state: ResearchState) -> str:
        """Determine next node after critic evaluation"""
        if state.get("critic_feedback") is None:
            return "synthesizer"
        
        retry_needed = state["critic_feedback"].get("retry_needed", False)
        can_retry = state["retry_count"] < 1
        
        if retry_needed and can_retry:
            state["retry_count"] += 1
            return "web_search"
        else:
            return "synthesizer"
    
    workflow.add_conditional_edges(
        "critic",
        route_after_critic,
        {
            "web_search": "web_search",
            "synthesizer": "synthesizer"
        }
    )
    
    # End after synthesis
    workflow.add_edge("synthesizer", END)
    
    # Compile without checkpointing for now (checkpointing requires async context)
    compiled_graph = workflow.compile()
    
    return compiled_graph
