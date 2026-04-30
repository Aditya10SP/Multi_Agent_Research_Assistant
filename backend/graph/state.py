from typing import TypedDict, List, Dict, Optional, Annotated
from operator import add

class ResearchState(TypedDict):
    """Shared state for LangGraph research workflow"""
    job_id: str
    question: str
    depth: str  # "quick" or "deep"
    plan: Optional[Dict]  # {sub_questions: List[str], strategy: str}
    web_results: List[Dict]  # [{url, title, snippet, source}]
    paper_results: List[Dict]  # [{title, authors, abstract, arxiv_id, url}]
    document_summaries: List[Dict]  # [{source, summary, key_points}]
    critic_feedback: Optional[Dict]  # {gaps: List[str], quality_score: float, retry_needed: bool}
    final_report: Optional[Dict]  # {summary, findings, evidence, limitations, references}
    status: str  # "planning", "searching", "reading", "critiquing", "synthesizing", "complete", "failed"
    current_node: str
    error_log: Annotated[List[str], add]  # Use add operator to merge error logs from parallel nodes
    retry_count: int
    node_executions: List[Dict]  # Detailed log of each node execution with inputs/outputs
