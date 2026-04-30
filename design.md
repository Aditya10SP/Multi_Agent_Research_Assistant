# Design Document: Multi-Agent Research Assistant

## Overview

The Multi-Agent Research Assistant is a full-stack application that autonomously conducts comprehensive research on user-provided questions using a coordinated system of specialized AI agents. Built on LangGraph for agent orchestration, the system decomposes complex research queries into manageable sub-tasks, executes parallel information gathering from multiple sources (web search, academic papers, documents), critically evaluates findings, and synthesizes a structured, cited research report. The backend uses Python with FastAPI and LangGraph, leveraging Groq's LLM API (llama-3.3-70b-versatile) for agent intelligence, while the frontend provides a real-time React-based interface with live agent visualization and streaming results via Server-Sent Events.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite + TailwindCSS)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Search     │  │    Agent     │  │ Intermediate │  │   History    │      │
│  │     Bar      │  │    Graph     │  │   Results    │  │   Sidebar    │      │
│  │              │  │  Visualizer  │  │    Panel     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐    │
│  │                        Report Viewer                                  │    │
│  │  (Summary, Key Findings, Evidence, Limitations, References)          │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ HTTP/REST + SSE
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                           BACKEND (FastAPI + Python)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         REST API Endpoints                              │  │
│  │  POST /research  │  GET /research/{id}/status (SSE)                     │  │
│  │  GET /research/{id}/report  │  GET /research/history                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Job Queue Manager (max 5 concurrent)                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                      LANGGRAPH AGENT ORCHESTRATION                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                          ┌──────────────────┐                                  │
│                          │  Planner Agent   │                                  │
│                          │  (llama-3.3-70b) │                                  │
│                          └────────┬─────────┘                                  │
│                                   │                                             │
│                    ┌──────────────┴──────────────┐                             │
│                    │                              │                             │
│          ┌─────────▼─────────┐        ┌─────────▼─────────┐                   │
│          │  Web Search Agent │        │ Paper Search Agent│                   │
│          │  (llama-3.1-8b)   │        │  (llama-3.1-8b)   │                   │
│          └─────────┬─────────┘        └─────────┬─────────┘                   │
│                    │                              │                             │
│                    └──────────────┬───────────────┘                             │
│                                   │                                             │
│                          ┌────────▼──────────┐                                 │
│                          │ Document Reader   │                                 │
│                          │   Agent           │                                 │
│                          │ (llama-3.1-8b)    │                                 │
│                          └────────┬──────────┘                                 │
│                                   │                                             │
│                          ┌────────▼──────────┐                                 │
│                          │   Critic Agent    │                                 │
│                          │  (llama-3.3-70b)  │                                 │
│                          └────────┬──────────┘                                 │
│                                   │                                             │
│                    ┌──────────────┴──────────────┐                             │
│                    │                              │                             │
│            (retry needed)                  (complete)                           │
│                    │                              │                             │
│          ┌─────────▼─────────┐        ┌─────────▼─────────┐                   │
│          │  Retry Web Search │        │ Synthesis Agent   │                   │
│          │  (max 1 retry)    │        │  (llama-3.3-70b)  │                   │
│          └─────────┬─────────┘        └─────────┬─────────┘                   │
│                    │                              │                             │
│                    └──────────────┐               │                             │
│                                   │               │                             │
│                          ┌────────▼───────────────▼──┐                         │
│                          │      END (Report Ready)   │                         │
│                          └───────────────────────────┘                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                              │
┌───────────────────▼──────────┐   ┌──────────────▼──────────────┐
│   EXTERNAL SERVICES          │   │      DATA LAYER              │
├──────────────────────────────┤   ├──────────────────────────────┤
│                              │   │                              │
│  • Groq API (LLM)            │   │  • SQLite Database           │
│    - llama-3.3-70b-versatile │   │    (Research Sessions)       │
│    - llama-3.1-8b-instant    │   │                              │
│                              │   │  • LangGraph Checkpoints     │
│  • DuckDuckGo Search         │   │    (State Persistence)       │
│    (No API key)              │   │                              │
│                              │   │                              │
│  • ArXiv API                 │   │                              │
│    (Academic Papers)         │   │                              │
│                              │   │                              │
│  • Wikipedia API             │   │                              │
│    (Encyclopedia)            │   │                              │
│                              │   │                              │
└──────────────────────────────┘   └──────────────────────────────┘


AGENT WORKFLOW DETAILS:
═══════════════════════

1. PLANNER → Breaks question into 3-5 sub-questions
2. WEB SEARCH + PAPER SEARCH → Execute in parallel
3. DOCUMENT READER → Summarizes all gathered content
4. CRITIC → Evaluates quality, identifies gaps
5. CONDITIONAL ROUTING:
   - If gaps found AND retry_count < 1 → Retry Web Search
   - Otherwise → Proceed to Synthesis
6. SYNTHESIZER → Generates final structured report
```

## Main Research Workflow

```
USER                 FASTAPI              JOB QUEUE           LANGGRAPH AGENTS              DATABASE
  │                     │                      │                      │                         │
  │  POST /research     │                      │                      │                         │
  ├────────────────────>│                      │                      │                         │
  │                     │  Create job          │                      │                         │
  │                     ├─────────────────────>│                      │                         │
  │  {job_id}           │                      │                      │                         │
  │<────────────────────┤                      │                      │                         │
  │                     │                      │  Execute Planner     │                         │
  │                     │                      ├─────────────────────>│                         │
  │                     │                      │                      │ Generate plan           │
  │                     │                      │                      │ (3-5 sub-questions)     │
  │  SSE: Plan ready    │                      │                      │                         │
  │<════════════════════╪══════════════════════╪══════════════════════╪═════════════════════════│
  │                     │                      │                      │                         │
  │                     │                      │  Web Search (parallel)                         │
  │                     │                      │  Paper Search (parallel)                       │
  │                     │                      ├─────────────────────>│                         │
  │                     │                      │                      │ DuckDuckGo API          │
  │                     │                      │                      │ ArXiv API               │
  │  SSE: Search done   │                      │                      │                         │
  │<════════════════════╪══════════════════════╪══════════════════════╪═════════════════════════│
  │                     │                      │                      │                         │
  │                     │                      │  Document Reader     │                         │
  │                     │                      ├─────────────────────>│                         │
  │                     │                      │                      │ Extract & summarize     │
  │                     │                      │                      │ (chunk + LLM)           │
  │  SSE: Summaries     │                      │                      │                         │
  │<════════════════════╪══════════════════════╪══════════════════════╪═════════════════════════│
  │                     │                      │                      │                         │
  │                     │                      │  Critic Agent        │                         │
  │                     │                      ├─────────────────────>│                         │
  │                     │                      │                      │ Evaluate quality        │
  │                     │                      │                      │ Check gaps              │
  │                     │                      │                      │                         │
  │                     │                      │  ┌─────────────────┐ │                         │
  │                     │                      │  │ If gaps found   │ │                         │
  │                     │                      │  │ & retry_count<1 │ │                         │
  │                     │                      │  └────────┬────────┘ │                         │
  │                     │                      │           │          │                         │
  │                     │                      │  Retry Web Search    │                         │
  │                     │                      │  (refined queries)   │                         │
  │                     │                      │           │          │                         │
  │                     │                      │  Re-evaluate Critic  │                         │
  │                     │                      │  └─────────────────┘ │                         │
  │                     │                      │                      │                         │
  │  SSE: Critic done   │                      │                      │                         │
  │<════════════════════╪══════════════════════╪══════════════════════╪═════════════════════════│
  │                     │                      │                      │                         │
  │                     │                      │  Synthesis Agent     │                         │
  │                     │                      ├─────────────────────>│                         │
  │                     │                      │                      │ Generate report         │
  │                     │                      │                      │ (Summary, Findings,     │
  │                     │                      │                      │  Evidence, Refs)        │
  │                     │                      │                      │                         │
  │                     │                      │                      │  Save session           │
  │                     │                      │                      ├────────────────────────>│
  │  SSE: Complete      │                      │                      │                         │
  │<════════════════════╪══════════════════════╪══════════════════════╪═════════════════════════│
  │                     │                      │                      │                         │
  │  GET /report/{id}   │                      │                      │                         │
  ├────────────────────>│                      │                      │                         │
  │                     │  Fetch from DB       │                      │                         │
  │                     ├──────────────────────┼──────────────────────┼────────────────────────>│
  │  Final Report JSON  │                      │                      │                         │
  │<────────────────────┤                      │                      │                         │
  │                     │                      │                      │                         │

Legend:
  ────>  HTTP Request/Response
  ════>  Server-Sent Events (SSE) Stream
```


## Components and Interfaces

### Component 1: LangGraph State Management

**Purpose**: Maintains shared state across all agents in the research workflow

**Interface**:
```python
from typing import TypedDict, List, Dict, Optional

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
    error_log: List[str]
    retry_count: int
```

**Responsibilities**:
- Store all intermediate and final research data
- Track workflow progress and current agent
- Enable state persistence via LangGraph checkpointing
- Support conditional routing based on state values

### Component 2: Agent Base Class

**Purpose**: Provides common functionality for all specialized agents

**Interface**:
```python
from abc import ABC, abstractmethod
from langchain_groq import ChatGroq
from typing import Dict

class BaseAgent(ABC):
    """Base class for all research agents"""
    
    def __init__(self, llm: ChatGroq, name: str):
        self.llm = llm
        self.name = name
        self.logger = self._setup_logger()
    
    @abstractmethod
    def execute(self, state: ResearchState) -> ResearchState:
        """Execute agent logic and return updated state"""
        pass
    
    def _setup_logger(self) -> logging.Logger:
        """Configure structured JSON logging"""
        pass
    
    def _load_prompt(self, prompt_name: str) -> str:
        """Load prompt template from prompts/ directory"""
        pass
    
    def _handle_error(self, error: Exception, state: ResearchState) -> ResearchState:
        """Log error and update state without crashing"""
        pass
```

**Responsibilities**:
- Provide LLM access to all agents
- Standardize error handling across agents
- Load externalized prompts from files
- Configure structured logging


### Component 3: Planner Agent

**Purpose**: Decomposes user question into structured research plan with sub-questions

**Interface**:
```python
class PlannerAgent(BaseAgent):
    """Breaks down research question into actionable sub-tasks"""
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Generate research plan with 3-5 sub-questions
        Returns updated state with plan field populated
        """
        pass
    
    def _generate_plan(self, question: str, depth: str) -> Dict:
        """Use LLM to create structured plan"""
        pass
```

**Responsibilities**:
- Analyze user question for scope and complexity
- Generate 3-5 focused sub-questions
- Determine search strategy based on depth parameter
- Output structured JSON plan

### Component 4: Web Search Agent

**Purpose**: Searches web using DuckDuckGo for recent articles and news

**Interface**:
```python
from duckduckgo_search import DDGS

class WebSearchAgent(BaseAgent):
    """Performs web searches for each sub-question"""
    
    def __init__(self, llm: ChatGroq, name: str):
        super().__init__(llm, name)
        self.ddgs = DDGS()
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Search web for each sub-question in plan
        Returns state with web_results populated
        """
        pass
    
    def _search_query(self, query: str, max_results: int = 5) -> List[Dict]:
        """Execute single DuckDuckGo search"""
        pass
    
    def _filter_results(self, results: List[Dict]) -> List[Dict]:
        """Remove low-quality or duplicate results"""
        pass
```

**Responsibilities**:
- Execute DuckDuckGo searches for each sub-question
- Filter and rank results by relevance
- Extract title, URL, snippet, and source
- Handle search API errors gracefully


### Component 5: Paper Search Agent

**Purpose**: Queries ArXiv API for academic papers relevant to research question

**Interface**:
```python
import arxiv

class PaperSearchAgent(BaseAgent):
    """Searches ArXiv for academic papers"""
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Query ArXiv for each sub-question
        Returns state with paper_results populated
        """
        pass
    
    def _search_arxiv(self, query: str, max_results: int = 5) -> List[Dict]:
        """Execute ArXiv API search"""
        pass
    
    def _extract_paper_metadata(self, paper: arxiv.Result) -> Dict:
        """Extract title, authors, abstract, URL, arxiv_id"""
        pass
```

**Responsibilities**:
- Query ArXiv API for each sub-question
- Extract paper metadata (title, authors, abstract, URL)
- Rank papers by relevance and citation count
- Handle API rate limits and errors

### Component 6: Document Reader Agent

**Purpose**: Extracts and summarizes content from URLs and documents

**Interface**:
```python
import fitz  # PyMuPDF
import wikipediaapi

class DocumentReaderAgent(BaseAgent):
    """Reads and summarizes documents from various sources"""
    
    def __init__(self, llm: ChatGroq, name: str):
        super().__init__(llm, name)
        self.wiki = wikipediaapi.Wikipedia('ResearchAssistant/1.0', 'en')
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Read and summarize all documents from web_results and paper_results
        Returns state with document_summaries populated
        """
        pass
    
    def _read_pdf(self, url: str) -> str:
        """Download and extract text from PDF"""
        pass
    
    def _read_wikipedia(self, title: str) -> str:
        """Fetch Wikipedia article content"""
        pass
    
    def _chunk_text(self, text: str, chunk_size: int = 2000) -> List[str]:
        """Split long documents into chunks for LLM processing"""
        pass
    
    def _summarize_chunk(self, chunk: str) -> str:
        """Use LLM to summarize text chunk"""
        pass
```

**Responsibilities**:
- Download and parse PDFs using PyMuPDF
- Fetch Wikipedia articles via API
- Chunk long documents for LLM processing
- Generate concise summaries with key points
- Handle various document formats and errors


### Component 7: Critic Agent

**Purpose**: Evaluates gathered information for quality, gaps, and contradictions

**Interface**:
```python
class CriticAgent(BaseAgent):
    """Reviews research quality and identifies gaps"""
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Analyze all gathered data for quality and completeness
        Returns state with critic_feedback populated
        """
        pass
    
    def _evaluate_coverage(self, state: ResearchState) -> Dict:
        """Check if all sub-questions are adequately answered"""
        pass
    
    def _detect_contradictions(self, summaries: List[Dict]) -> List[str]:
        """Identify conflicting information across sources"""
        pass
    
    def _assess_source_quality(self, results: List[Dict]) -> float:
        """Score overall source quality (0-1)"""
        pass
    
    def _should_retry(self, feedback: Dict, retry_count: int) -> bool:
        """Determine if additional search is needed (max 1 retry)"""
        pass
```

**Responsibilities**:
- Evaluate coverage of all sub-questions
- Detect contradictions across sources
- Assess source credibility and quality
- Decide if additional search iteration is needed
- Limit retries to prevent infinite loops

### Component 8: Synthesis Agent

**Purpose**: Combines all research into structured, cited final report

**Interface**:
```python
class SynthesisAgent(BaseAgent):
    """Generates final structured research report"""
    
    def execute(self, state: ResearchState) -> ResearchState:
        """
        Synthesize all data into final report
        Returns state with final_report populated and status="complete"
        """
        pass
    
    def _generate_summary(self, state: ResearchState) -> str:
        """Create executive summary (2-3 paragraphs)"""
        pass
    
    def _extract_key_findings(self, summaries: List[Dict]) -> List[Dict]:
        """Identify and structure main findings with citations"""
        pass
    
    def _compile_evidence(self, findings: List[Dict], results: List[Dict]) -> List[Dict]:
        """Link findings to supporting sources"""
        pass
    
    def _identify_limitations(self, critic_feedback: Dict) -> List[str]:
        """Document research limitations and gaps"""
        pass
    
    def _format_references(self, web_results: List[Dict], paper_results: List[Dict]) -> List[Dict]:
        """Create formatted citation list"""
        pass
```

**Responsibilities**:
- Generate executive summary
- Structure key findings with citations
- Compile supporting evidence
- Document limitations and gaps
- Format references in consistent style


### Component 9: LangGraph Research Graph

**Purpose**: Orchestrates agent execution with conditional routing and checkpointing

**Interface**:
```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

class ResearchGraph:
    """LangGraph workflow orchestrator"""
    
    def __init__(self, agents: Dict[str, BaseAgent], checkpointer: SqliteSaver):
        self.agents = agents
        self.checkpointer = checkpointer
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Construct LangGraph with nodes and edges"""
        pass
    
    def _route_after_critic(self, state: ResearchState) -> str:
        """Conditional routing: retry search or proceed to synthesis"""
        pass
    
    def execute(self, initial_state: ResearchState) -> ResearchState:
        """Run complete research workflow"""
        pass
```

**Responsibilities**:
- Define agent execution order and dependencies
- Implement conditional routing based on state
- Enable parallel execution of Web Search and Paper Search
- Persist state at each step via checkpointing
- Support workflow resumption after failures

### Component 10: FastAPI Backend

**Purpose**: Provides REST API and SSE endpoints for frontend communication

**Interface**:
```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

class ResearchRequest(BaseModel):
    question: str
    depth: str  # "quick" or "deep"

class ResearchAPI:
    """FastAPI application with research endpoints"""
    
    def __init__(self, graph: ResearchGraph, db_session):
        self.app = FastAPI()
        self.graph = graph
        self.db = db_session
        self.job_queue = JobQueue(max_concurrent=5)
        self._setup_routes()
    
    async def create_research_job(self, request: ResearchRequest) -> Dict:
        """POST /research - Start new research job"""
        pass
    
    async def get_job_status(self, job_id: str) -> StreamingResponse:
        """GET /research/{job_id}/status - SSE stream of progress"""
        pass
    
    async def get_report(self, job_id: str) -> Dict:
        """GET /research/{job_id}/report - Retrieve final report"""
        pass
    
    async def get_history(self) -> List[Dict]:
        """GET /research/history - List past sessions"""
        pass
```

**Responsibilities**:
- Handle HTTP requests and responses
- Manage async job queue with rate limiting
- Stream real-time updates via Server-Sent Events
- Store and retrieve research sessions from database
- Provide CORS support for frontend


### Component 11: Job Queue Manager

**Purpose**: Manages concurrent research jobs with rate limiting

**Interface**:
```python
import asyncio
from typing import Dict, Optional

class JobQueue:
    """Manages concurrent research job execution"""
    
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.active_jobs: Dict[str, asyncio.Task] = {}
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def submit_job(self, job_id: str, graph: ResearchGraph, initial_state: ResearchState) -> str:
        """Submit new job to queue"""
        pass
    
    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get current status of job"""
        pass
    
    def is_job_complete(self, job_id: str) -> bool:
        """Check if job has finished"""
        pass
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel running job"""
        pass
```

**Responsibilities**:
- Limit concurrent jobs to prevent resource exhaustion
- Track active job states
- Support job cancellation
- Provide job status queries

### Component 12: SSE Event Stream

**Purpose**: Streams real-time agent updates to frontend

**Interface**:
```python
from typing import AsyncGenerator
import json

class SSEStream:
    """Server-Sent Events stream generator"""
    
    def __init__(self, job_id: str, job_queue: JobQueue):
        self.job_id = job_id
        self.job_queue = job_queue
    
    async def generate_events(self) -> AsyncGenerator[str, None]:
        """
        Yield SSE-formatted events as job progresses
        Format: data: {event_type, node, data, timestamp}\n\n
        """
        pass
    
    def _format_sse_event(self, event_type: str, data: Dict) -> str:
        """Format data as SSE message"""
        pass
```

**Responsibilities**:
- Poll job queue for state updates
- Format updates as SSE events
- Stream events to frontend in real-time
- Handle client disconnections gracefully


### Component 13: React Frontend Application

**Purpose**: Provides interactive UI for research queries and real-time visualization

**Interface**:
```typescript
// Main App Component
interface AppProps {}

interface AppState {
  currentJobId: string | null;
  jobStatus: JobStatus | null;
  finalReport: Report | null;
  history: ResearchSession[];
  darkMode: boolean;
}

const App: React.FC<AppProps> = () => {
  const [state, setState] = useState<AppState>(initialState);
  const { events, connect, disconnect } = useSSE();
  
  const handleSearch = async (question: string, depth: string) => {
    // POST /research
  };
  
  const loadHistory = async () => {
    // GET /research/history
  };
  
  return (
    <div className="app-container">
      <SearchBar onSearch={handleSearch} />
      <div className="main-content">
        <AgentGraph jobStatus={state.jobStatus} />
        <IntermediateResults events={events} />
      </div>
      <ReportViewer report={state.finalReport} />
      <HistorySidebar history={state.history} onSelect={loadSession} />
    </div>
  );
};
```

**Responsibilities**:
- Manage application state and user interactions
- Coordinate communication between components
- Handle SSE connection lifecycle
- Persist UI preferences (dark mode)

### Component 14: Agent Graph Visualizer

**Purpose**: Real-time visualization of agent workflow using React Flow

**Interface**:
```typescript
import ReactFlow, { Node, Edge } from 'reactflow';

interface AgentGraphProps {
  jobStatus: JobStatus | null;
}

const AgentGraph: React.FC<AgentGraphProps> = ({ jobStatus }) => {
  const nodes: Node[] = [
    { id: 'planner', data: { label: 'Planner' }, position: { x: 250, y: 0 } },
    { id: 'web_search', data: { label: 'Web Search' }, position: { x: 100, y: 100 } },
    { id: 'paper_search', data: { label: 'Paper Search' }, position: { x: 400, y: 100 } },
    // ... more nodes
  ];
  
  const getNodeStyle = (nodeId: string): React.CSSProperties => {
    // Blue for active, green for complete, red for failed
  };
  
  return <ReactFlow nodes={nodes} edges={edges} />;
};
```

**Responsibilities**:
- Render agent workflow as interactive graph
- Highlight current active agent in blue
- Mark completed agents in green
- Mark failed agents in red
- Update visualization in real-time via SSE


### Component 15: Search Bar Component

**Purpose**: Input interface for research questions with depth toggle

**Interface**:
```typescript
interface SearchBarProps {
  onSearch: (question: string, depth: string) => Promise<void>;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSearch(question, depth);
  };
  
  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <input 
        type="text" 
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your research question..."
      />
      <DepthToggle value={depth} onChange={setDepth} />
      <button type="submit" disabled={isLoading}>Research</button>
    </form>
  );
};
```

**Responsibilities**:
- Capture user research question
- Provide quick/deep depth toggle
- Validate input before submission
- Disable during active research

### Component 16: Intermediate Results Panel

**Purpose**: Displays streaming results as agents complete their work

**Interface**:
```typescript
interface IntermediateResultsProps {
  events: SSEEvent[];
}

interface SSEEvent {
  event_type: string;
  node: string;
  data: any;
  timestamp: string;
}

const IntermediateResults: React.FC<IntermediateResultsProps> = ({ events }) => {
  const renderEvent = (event: SSEEvent) => {
    switch (event.node) {
      case 'planner':
        return <PlanDisplay plan={event.data} />;
      case 'web_search':
        return <WebResultsSnippet results={event.data} />;
      case 'paper_search':
        return <PaperResultsSnippet papers={event.data} />;
      case 'document_reader':
        return <SummarySnippet summaries={event.data} />;
      case 'critic':
        return <CriticFeedback feedback={event.data} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="intermediate-results">
      {events.map((event, idx) => (
        <div key={idx} className="result-card">
          {renderEvent(event)}
        </div>
      ))}
    </div>
  );
};
```

**Responsibilities**:
- Display real-time agent outputs
- Format different result types appropriately
- Auto-scroll to latest results
- Provide expandable/collapsible cards


### Component 17: Report Viewer Component

**Purpose**: Displays final structured research report with collapsible sections

**Interface**:
```typescript
interface ReportViewerProps {
  report: Report | null;
}

interface Report {
  summary: string;
  key_findings: Finding[];
  supporting_evidence: Evidence[];
  limitations: string[];
  references: Reference[];
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary'])
  );
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };
  
  if (!report) return <EmptyState />;
  
  return (
    <div className="report-viewer">
      <Section title="Summary" expanded={expandedSections.has('summary')}>
        <p>{report.summary}</p>
      </Section>
      <Section title="Key Findings" expanded={expandedSections.has('findings')}>
        <FindingsList findings={report.key_findings} />
      </Section>
      <Section title="Supporting Evidence" expanded={expandedSections.has('evidence')}>
        <EvidenceList evidence={report.supporting_evidence} />
      </Section>
      <Section title="Limitations" expanded={expandedSections.has('limitations')}>
        <LimitationsList limitations={report.limitations} />
      </Section>
      <Section title="References" expanded={expandedSections.has('references')}>
        <ReferencesList references={report.references} />
      </Section>
    </div>
  );
};
```

**Responsibilities**:
- Display final report in structured format
- Support collapsible sections
- Render citations as clickable links
- Provide export functionality (PDF, Markdown)

### Component 18: History Sidebar Component

**Purpose**: Shows past research sessions for quick access

**Interface**:
```typescript
interface HistorySidebarProps {
  history: ResearchSession[];
  onSelect: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface ResearchSession {
  job_id: string;
  question: string;
  depth: string;
  created_at: string;
  status: string;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  history, 
  onSelect, 
  isOpen, 
  onToggle 
}) => {
  return (
    <aside className={`history-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button onClick={onToggle} className="toggle-btn">
        {isOpen ? '←' : '→'}
      </button>
      <h3>Research History</h3>
      <ul>
        {history.map(session => (
          <li key={session.job_id} onClick={() => onSelect(session.job_id)}>
            <div className="session-question">{session.question}</div>
            <div className="session-meta">
              {new Date(session.created_at).toLocaleDateString()} • {session.depth}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};
```

**Responsibilities**:
- List past research sessions
- Display question and metadata
- Support session selection and reload
- Provide collapsible sidebar


### Component 19: useSSE Custom Hook

**Purpose**: Manages Server-Sent Events connection and state

**Interface**:
```typescript
interface UseSSEResult {
  events: SSEEvent[];
  isConnected: boolean;
  error: Error | null;
  connect: (jobId: string) => void;
  disconnect: () => void;
}

const useSSE = (): UseSSEResult => {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const connect = (jobId: string) => {
    const eventSource = new EventSource(`/api/research/${jobId}/status`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, data]);
    };
    
    eventSource.onerror = (err) => {
      setError(new Error('SSE connection failed'));
      disconnect();
    };
    
    eventSourceRef.current = eventSource;
    setIsConnected(true);
  };
  
  const disconnect = () => {
    eventSourceRef.current?.close();
    setIsConnected(false);
  };
  
  useEffect(() => {
    return () => disconnect();
  }, []);
  
  return { events, isConnected, error, connect, disconnect };
};
```

**Responsibilities**:
- Establish SSE connection to backend
- Parse and store incoming events
- Handle connection errors and reconnection
- Clean up on component unmount

## Data Models

### Model 1: ResearchState (LangGraph State)

```python
from typing import TypedDict, List, Dict, Optional

class ResearchState(TypedDict):
    job_id: str
    question: str
    depth: str
    plan: Optional[Dict]
    web_results: List[Dict]
    paper_results: List[Dict]
    document_summaries: List[Dict]
    critic_feedback: Optional[Dict]
    final_report: Optional[Dict]
    status: str
    current_node: str
    error_log: List[str]
    retry_count: int
```

**Validation Rules**:
- `job_id` must be unique UUID
- `depth` must be "quick" or "deep"
- `status` must be one of: "planning", "searching", "reading", "critiquing", "synthesizing", "complete", "failed"
- `retry_count` must be <= 1
- `question` must be non-empty string


### Model 2: ResearchSession (Database Model)

```python
from sqlalchemy import Column, String, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class ResearchSession(Base):
    __tablename__ = 'research_sessions'
    
    job_id = Column(String, primary_key=True)
    question = Column(Text, nullable=False)
    depth = Column(String, nullable=False)
    status = Column(String, nullable=False)
    final_report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
```

**Validation Rules**:
- `job_id` is primary key (UUID format)
- `question` cannot be null or empty
- `depth` must be "quick" or "deep"
- `status` must match ResearchState status values
- `created_at` auto-populated on insert
- `completed_at` set when status becomes "complete" or "failed"

### Model 3: Plan Schema

```python
from pydantic import BaseModel, Field
from typing import List

class ResearchPlan(BaseModel):
    sub_questions: List[str] = Field(..., min_items=3, max_items=5)
    strategy: str = Field(..., description="quick or deep research strategy")
    estimated_time: int = Field(..., description="Estimated completion time in seconds")
    search_keywords: List[str] = Field(..., description="Key terms for searches")
```

**Validation Rules**:
- `sub_questions` must contain 3-5 items
- Each sub-question must be non-empty string
- `strategy` must match depth parameter
- `estimated_time` must be positive integer
- `search_keywords` must contain at least 2 items

### Model 4: Web Search Result Schema

```python
from pydantic import BaseModel, HttpUrl
from typing import Optional

class WebSearchResult(BaseModel):
    url: HttpUrl
    title: str
    snippet: str
    source: str
    relevance_score: Optional[float] = None
    timestamp: str
```

**Validation Rules**:
- `url` must be valid HTTP/HTTPS URL
- `title` and `snippet` cannot be empty
- `source` is domain name extracted from URL
- `relevance_score` is float between 0 and 1 if present
- `timestamp` is ISO 8601 format


### Model 5: Paper Search Result Schema

```python
from pydantic import BaseModel, HttpUrl
from typing import List

class PaperSearchResult(BaseModel):
    title: str
    authors: List[str]
    abstract: str
    arxiv_id: str
    url: HttpUrl
    published_date: str
    categories: List[str]
```

**Validation Rules**:
- `title` cannot be empty
- `authors` must contain at least 1 author
- `abstract` cannot be empty
- `arxiv_id` must match ArXiv ID format (e.g., "2301.12345")
- `url` must be valid ArXiv URL
- `published_date` is ISO 8601 format
- `categories` contains ArXiv category codes

### Model 6: Document Summary Schema

```python
from pydantic import BaseModel
from typing import List, Optional

class DocumentSummary(BaseModel):
    source: str
    source_type: str  # "web", "paper", "wikipedia"
    summary: str
    key_points: List[str]
    word_count: int
    confidence_score: Optional[float] = None
```

**Validation Rules**:
- `source` is URL or identifier
- `source_type` must be "web", "paper", or "wikipedia"
- `summary` must be 100-500 words
- `key_points` must contain 2-5 items
- `word_count` is original document word count
- `confidence_score` is float between 0 and 1 if present

### Model 7: Critic Feedback Schema

```python
from pydantic import BaseModel, Field
from typing import List

class CriticFeedback(BaseModel):
    gaps: List[str] = Field(..., description="Unanswered sub-questions or missing info")
    contradictions: List[str] = Field(default_factory=list)
    quality_score: float = Field(..., ge=0.0, le=1.0)
    source_credibility: float = Field(..., ge=0.0, le=1.0)
    retry_needed: bool
    retry_queries: List[str] = Field(default_factory=list)
```

**Validation Rules**:
- `gaps` lists specific missing information
- `contradictions` lists conflicting statements found
- `quality_score` is overall quality rating (0-1)
- `source_credibility` is average source trust score (0-1)
- `retry_needed` is True only if quality_score < 0.6 and retry_count < 1
- `retry_queries` populated only if retry_needed is True


### Model 8: Final Report Schema

```python
from pydantic import BaseModel
from typing import List

class Finding(BaseModel):
    statement: str
    citations: List[str]  # List of source URLs or identifiers
    confidence: str  # "high", "medium", "low"

class Evidence(BaseModel):
    finding_id: int
    source: str
    excerpt: str
    url: str

class Reference(BaseModel):
    id: str
    title: str
    authors: List[str]
    url: str
    source_type: str  # "web", "paper", "wikipedia"
    accessed_date: str

class FinalReport(BaseModel):
    summary: str
    key_findings: List[Finding]
    supporting_evidence: List[Evidence]
    limitations: List[str]
    references: List[Reference]
    metadata: dict  # {generated_at, total_sources, research_depth}
```

**Validation Rules**:
- `summary` must be 200-500 words
- `key_findings` must contain 3-10 findings
- Each finding must have at least 1 citation
- `supporting_evidence` links to findings via finding_id
- `limitations` documents gaps identified by critic
- `references` contains all cited sources
- `metadata` includes generation timestamp and stats

## Algorithmic Pseudocode

### Main Research Workflow Algorithm

```python
def execute_research_workflow(question: str, depth: str) -> FinalReport:
    """
    Main research workflow orchestrated by LangGraph
    
    Preconditions:
        - question is non-empty string
        - depth is "quick" or "deep"
        - All agents are initialized with valid LLM instances
        - Database connection is established
    
    Postconditions:
        - Returns FinalReport with all required sections
        - Research session is persisted to database
        - All intermediate states are checkpointed
        - Status is "complete" or "failed"
    
    Loop Invariants:
        - state.retry_count <= 1 throughout execution
        - state.status reflects current workflow stage
        - All completed agents have populated their state fields
    """
    # Initialize state
    state = ResearchState(
        job_id=generate_uuid(),
        question=question,
        depth=depth,
        plan=None,
        web_results=[],
        paper_results=[],
        document_summaries=[],
        critic_feedback=None,
        final_report=None,
        status="planning",
        current_node="planner",
        error_log=[],
        retry_count=0
    )
    
    try:
        # Step 1: Planning
        state = planner_agent.execute(state)
        assert state.plan is not None
        assert len(state.plan['sub_questions']) >= 3
        state.status = "searching"
        emit_sse_event("planner_complete", state.plan)
        
        # Step 2: Parallel search (web + papers)
        web_task = async_execute(web_search_agent, state)
        paper_task = async_execute(paper_search_agent, state)
        
        web_state, paper_state = await asyncio.gather(web_task, paper_task)
        state.web_results = web_state.web_results
        state.paper_results = paper_state.paper_results
        
        emit_sse_event("search_complete", {
            "web_count": len(state.web_results),
            "paper_count": len(state.paper_results)
        })
        
        # Step 3: Document reading
        state.status = "reading"
        state = document_reader_agent.execute(state)
        assert len(state.document_summaries) > 0
        emit_sse_event("reading_complete", state.document_summaries)
        
        # Step 4: Critical evaluation
        state.status = "critiquing"
        state = critic_agent.execute(state)
        assert state.critic_feedback is not None
        emit_sse_event("critic_complete", state.critic_feedback)
        
        # Step 5: Conditional retry
        if state.critic_feedback['retry_needed'] and state.retry_count < 1:
            state.retry_count += 1
            state.status = "searching"
            
            # Retry with refined queries
            retry_state = web_search_agent.execute(state)
            state.web_results.extend(retry_state.web_results)
            
            # Re-read new documents
            state = document_reader_agent.execute(state)
            
            # Re-evaluate
            state = critic_agent.execute(state)
            emit_sse_event("retry_complete", state.critic_feedback)
        
        # Step 6: Synthesis
        state.status = "synthesizing"
        state = synthesis_agent.execute(state)
        assert state.final_report is not None
        assert len(state.final_report['key_findings']) >= 3
        
        state.status = "complete"
        emit_sse_event("synthesis_complete", state.final_report)
        
        # Step 7: Persist to database
        save_research_session(state)
        
        return state.final_report
        
    except Exception as e:
        state.status = "failed"
        state.error_log.append(str(e))
        log_error(e, state)
        save_research_session(state)
        raise
```


### Planner Agent Algorithm

```python
def planner_execute(state: ResearchState) -> ResearchState:
    """
    Generate structured research plan from user question
    
    Preconditions:
        - state.question is non-empty string
        - state.depth is "quick" or "deep"
        - LLM is initialized and accessible
    
    Postconditions:
        - state.plan contains 3-5 sub-questions
        - state.plan includes search strategy
        - state.current_node is updated to "planner"
    
    Loop Invariants:
        - Each generated sub-question is unique
        - Sub-questions collectively cover the main question
    """
    state.current_node = "planner"
    
    # Load prompt template
    prompt_template = load_prompt("planner_prompt.txt")
    
    # Determine complexity based on depth
    num_questions = 5 if state.depth == "deep" else 3
    
    # Construct prompt with question and depth
    prompt = prompt_template.format(
        question=state.question,
        depth=state.depth,
        num_questions=num_questions
    )
    
    # Call LLM to generate plan
    response = llm_heavy.invoke(prompt)
    
    # Parse JSON response
    plan = json.loads(response.content)
    
    # Validate plan structure
    assert 'sub_questions' in plan
    assert len(plan['sub_questions']) >= 3
    assert len(plan['sub_questions']) <= 5
    
    # Store plan in state
    state.plan = plan
    
    log_info(f"Generated plan with {len(plan['sub_questions'])} sub-questions")
    
    return state
```

### Web Search Agent Algorithm

```python
def web_search_execute(state: ResearchState) -> ResearchState:
    """
    Search web for each sub-question using DuckDuckGo
    
    Preconditions:
        - state.plan is not None
        - state.plan['sub_questions'] contains 3-5 questions
        - DuckDuckGo search client is initialized
    
    Postconditions:
        - state.web_results contains search results
        - Each sub-question has at least 1 result (if available)
        - Results are deduplicated by URL
    
    Loop Invariants:
        - All processed sub-questions have results appended
        - No duplicate URLs in web_results
    """
    state.current_node = "web_search"
    results = []
    seen_urls = set()
    
    max_results_per_query = 5 if state.depth == "deep" else 3
    
    # Search for each sub-question
    for sub_question in state.plan['sub_questions']:
        try:
            # Execute DuckDuckGo search
            search_results = ddgs.text(
                sub_question,
                max_results=max_results_per_query
            )
            
            # Process and filter results
            for result in search_results:
                url = result['href']
                
                # Skip duplicates
                if url in seen_urls:
                    continue
                
                seen_urls.add(url)
                
                # Extract domain as source
                source = extract_domain(url)
                
                # Create structured result
                web_result = WebSearchResult(
                    url=url,
                    title=result['title'],
                    snippet=result['body'],
                    source=source,
                    timestamp=datetime.utcnow().isoformat()
                )
                
                results.append(web_result.dict())
            
        except Exception as e:
            log_error(f"Search failed for: {sub_question}", e)
            state.error_log.append(f"Web search error: {str(e)}")
            continue
    
    state.web_results = results
    log_info(f"Found {len(results)} web results")
    
    return state
```


### Paper Search Agent Algorithm

```python
def paper_search_execute(state: ResearchState) -> ResearchState:
    """
    Query ArXiv API for academic papers
    
    Preconditions:
        - state.plan is not None
        - state.plan['sub_questions'] contains 3-5 questions
        - ArXiv API client is initialized
    
    Postconditions:
        - state.paper_results contains paper metadata
        - Papers are sorted by relevance
        - Each paper has title, authors, abstract, URL
    
    Loop Invariants:
        - All processed sub-questions have paper results appended
        - No duplicate ArXiv IDs in paper_results
    """
    state.current_node = "paper_search"
    results = []
    seen_arxiv_ids = set()
    
    max_papers_per_query = 5 if state.depth == "deep" else 3
    
    # Search ArXiv for each sub-question
    for sub_question in state.plan['sub_questions']:
        try:
            # Query ArXiv API
            search = arxiv.Search(
                query=sub_question,
                max_results=max_papers_per_query,
                sort_by=arxiv.SortCriterion.Relevance
            )
            
            # Process results
            for paper in search.results():
                arxiv_id = paper.entry_id.split('/')[-1]
                
                # Skip duplicates
                if arxiv_id in seen_arxiv_ids:
                    continue
                
                seen_arxiv_ids.add(arxiv_id)
                
                # Extract paper metadata
                paper_result = PaperSearchResult(
                    title=paper.title,
                    authors=[author.name for author in paper.authors],
                    abstract=paper.summary,
                    arxiv_id=arxiv_id,
                    url=paper.entry_id,
                    published_date=paper.published.isoformat(),
                    categories=paper.categories
                )
                
                results.append(paper_result.dict())
                
        except Exception as e:
            log_error(f"ArXiv search failed for: {sub_question}", e)
            state.error_log.append(f"Paper search error: {str(e)}")
            continue
    
    state.paper_results = results
    log_info(f"Found {len(results)} papers")
    
    return state
```

### Document Reader Agent Algorithm

```python
def document_reader_execute(state: ResearchState) -> ResearchState:
    """
    Read and summarize documents from web and paper results
    
    Preconditions:
        - state.web_results or state.paper_results is not empty
        - LLM is initialized for summarization
    
    Postconditions:
        - state.document_summaries contains summaries
        - Each summary has source, key_points, and summary text
        - Long documents are chunked and processed
    
    Loop Invariants:
        - All processed documents have summaries appended
        - Summaries maintain source traceability
    """
    state.current_node = "document_reader"
    summaries = []
    
    # Process web results
    for web_result in state.web_results:
        try:
            # Fetch content (simplified - would use requests + BeautifulSoup)
            content = fetch_web_content(web_result['url'])
            
            if not content:
                continue
            
            # Chunk if too long
            chunks = chunk_text(content, chunk_size=2000)
            
            # Summarize each chunk
            chunk_summaries = []
            for chunk in chunks:
                summary = llm_fast.invoke(
                    f"Summarize this text concisely:\n\n{chunk}"
                )
                chunk_summaries.append(summary.content)
            
            # Combine chunk summaries
            combined_summary = " ".join(chunk_summaries)
            
            # Extract key points using LLM
            key_points_response = llm_fast.invoke(
                f"Extract 3-5 key points from this summary:\n\n{combined_summary}"
            )
            key_points = parse_key_points(key_points_response.content)
            
            # Create document summary
            doc_summary = DocumentSummary(
                source=web_result['url'],
                source_type="web",
                summary=combined_summary[:500],  # Limit length
                key_points=key_points,
                word_count=len(content.split())
            )
            
            summaries.append(doc_summary.dict())
            
        except Exception as e:
            log_error(f"Failed to read: {web_result['url']}", e)
            state.error_log.append(f"Document read error: {str(e)}")
            continue
    
    # Process paper abstracts (already have text)
    for paper_result in state.paper_results:
        try:
            # Papers already have abstracts, just extract key points
            key_points_response = llm_fast.invoke(
                f"Extract 3-5 key points from this abstract:\n\n{paper_result['abstract']}"
            )
            key_points = parse_key_points(key_points_response.content)
            
            doc_summary = DocumentSummary(
                source=paper_result['url'],
                source_type="paper",
                summary=paper_result['abstract'][:500],
                key_points=key_points,
                word_count=len(paper_result['abstract'].split())
            )
            
            summaries.append(doc_summary.dict())
            
        except Exception as e:
            log_error(f"Failed to process paper: {paper_result['title']}", e)
            continue
    
    state.document_summaries = summaries
    log_info(f"Generated {len(summaries)} document summaries")
    
    return state
```


### Critic Agent Algorithm

```python
def critic_execute(state: ResearchState) -> ResearchState:
    """
    Evaluate research quality and identify gaps
    
    Preconditions:
        - state.document_summaries is not empty
        - state.plan contains sub_questions
        - LLM is initialized for evaluation
    
    Postconditions:
        - state.critic_feedback contains evaluation results
        - retry_needed flag is set appropriately
        - quality_score is between 0 and 1
    
    Loop Invariants:
        - All sub-questions are checked for coverage
        - Quality metrics are consistently calculated
    """
    state.current_node = "critic"
    
    # Load critic prompt
    prompt_template = load_prompt("critic_prompt.txt")
    
    # Prepare data for evaluation
    evaluation_data = {
        "question": state.question,
        "sub_questions": state.plan['sub_questions'],
        "summaries": state.document_summaries,
        "num_sources": len(state.web_results) + len(state.paper_results)
    }
    
    # Construct evaluation prompt
    prompt = prompt_template.format(**evaluation_data)
    
    # Get LLM evaluation
    response = llm_heavy.invoke(prompt)
    feedback_raw = json.loads(response.content)
    
    # Calculate quality score
    coverage_score = calculate_coverage_score(
        state.plan['sub_questions'],
        state.document_summaries
    )
    
    source_quality_score = calculate_source_quality(
        state.web_results,
        state.paper_results
    )
    
    overall_quality = (coverage_score + source_quality_score) / 2
    
    # Determine if retry is needed
    retry_needed = (
        overall_quality < 0.6 and 
        state.retry_count < 1 and
        len(feedback_raw.get('gaps', [])) > 0
    )
    
    # Create feedback object
    feedback = CriticFeedback(
        gaps=feedback_raw.get('gaps', []),
        contradictions=feedback_raw.get('contradictions', []),
        quality_score=overall_quality,
        source_credibility=source_quality_score,
        retry_needed=retry_needed,
        retry_queries=feedback_raw.get('retry_queries', []) if retry_needed else []
    )
    
    state.critic_feedback = feedback.dict()
    
    log_info(f"Critic evaluation: quality={overall_quality:.2f}, retry={retry_needed}")
    
    return state


def calculate_coverage_score(sub_questions: List[str], summaries: List[Dict]) -> float:
    """
    Calculate how well summaries cover sub-questions
    
    Preconditions:
        - sub_questions is non-empty list
        - summaries is non-empty list
    
    Postconditions:
        - Returns float between 0 and 1
        - Higher score means better coverage
    """
    if not summaries:
        return 0.0
    
    covered_count = 0
    
    # Check each sub-question for coverage
    for sub_q in sub_questions:
        # Simple keyword matching (could use embeddings for better accuracy)
        keywords = extract_keywords(sub_q)
        
        # Check if any summary addresses this sub-question
        for summary in summaries:
            summary_text = summary['summary'] + ' '.join(summary['key_points'])
            
            # Count keyword matches
            matches = sum(1 for kw in keywords if kw.lower() in summary_text.lower())
            
            # Consider covered if >50% keywords match
            if matches / len(keywords) > 0.5:
                covered_count += 1
                break
    
    return covered_count / len(sub_questions)


def calculate_source_quality(web_results: List[Dict], paper_results: List[Dict]) -> float:
    """
    Assess overall source quality and credibility
    
    Preconditions:
        - web_results and paper_results are lists (may be empty)
    
    Postconditions:
        - Returns float between 0 and 1
        - Academic papers weighted higher than web sources
    """
    if not web_results and not paper_results:
        return 0.0
    
    total_score = 0.0
    total_sources = 0
    
    # Academic papers get high credibility
    for paper in paper_results:
        total_score += 0.9  # Papers are highly credible
        total_sources += 1
    
    # Web sources scored by domain reputation
    for web in web_results:
        domain = web['source']
        credibility = assess_domain_credibility(domain)
        total_score += credibility
        total_sources += 1
    
    return total_score / total_sources if total_sources > 0 else 0.0


def assess_domain_credibility(domain: str) -> float:
    """
    Score domain credibility based on known reputable sources
    
    Preconditions:
        - domain is non-empty string
    
    Postconditions:
        - Returns float between 0.3 and 0.9
    """
    high_credibility = [
        'edu', 'gov', 'wikipedia.org', 'nature.com', 
        'science.org', 'ieee.org', 'acm.org'
    ]
    
    medium_credibility = [
        'medium.com', 'towardsdatascience.com', 'stackoverflow.com'
    ]
    
    # Check for high credibility domains
    for trusted in high_credibility:
        if trusted in domain:
            return 0.9
    
    # Check for medium credibility
    for medium in medium_credibility:
        if medium in domain:
            return 0.7
    
    # Default credibility for unknown domains
    return 0.5
```


### Synthesis Agent Algorithm

```python
def synthesis_execute(state: ResearchState) -> ResearchState:
    """
    Generate final structured research report
    
    Preconditions:
        - state.document_summaries is not empty
        - state.critic_feedback is not None
        - state.plan contains sub_questions
    
    Postconditions:
        - state.final_report contains all required sections
        - Report has 3-10 key findings with citations
        - All sources are properly referenced
    
    Loop Invariants:
        - Each finding has at least one citation
        - All citations link to actual sources
    """
    state.current_node = "synthesizer"
    
    # Load synthesis prompt
    prompt_template = load_prompt("synthesis_prompt.txt")
    
    # Prepare all data for synthesis
    synthesis_data = {
        "question": state.question,
        "plan": state.plan,
        "summaries": state.document_summaries,
        "web_results": state.web_results,
        "paper_results": state.paper_results,
        "critic_feedback": state.critic_feedback
    }
    
    # Generate summary section
    summary = generate_summary(synthesis_data)
    
    # Extract key findings with citations
    findings = extract_key_findings(synthesis_data)
    
    # Compile supporting evidence
    evidence = compile_evidence(findings, synthesis_data)
    
    # Document limitations
    limitations = identify_limitations(state.critic_feedback)
    
    # Format references
    references = format_references(
        state.web_results,
        state.paper_results
    )
    
    # Create final report
    report = FinalReport(
        summary=summary,
        key_findings=findings,
        supporting_evidence=evidence,
        limitations=limitations,
        references=references,
        metadata={
            "generated_at": datetime.utcnow().isoformat(),
            "total_sources": len(references),
            "research_depth": state.depth,
            "quality_score": state.critic_feedback['quality_score']
        }
    )
    
    state.final_report = report.dict()
    
    log_info(f"Generated report with {len(findings)} findings and {len(references)} references")
    
    return state


def generate_summary(synthesis_data: Dict) -> str:
    """
    Create executive summary (200-500 words)
    
    Preconditions:
        - synthesis_data contains question and summaries
        - LLM is initialized
    
    Postconditions:
        - Returns summary string of 200-500 words
        - Summary addresses original question
    """
    prompt = f"""
    Create a comprehensive executive summary (200-500 words) that answers this research question:
    
    Question: {synthesis_data['question']}
    
    Based on these findings:
    {format_summaries_for_prompt(synthesis_data['summaries'])}
    
    The summary should:
    1. Directly answer the research question
    2. Highlight the most important findings
    3. Be accessible to a general audience
    4. Avoid technical jargon where possible
    """
    
    response = llm_heavy.invoke(prompt)
    summary = response.content.strip()
    
    # Ensure word count is within range
    word_count = len(summary.split())
    if word_count < 200:
        log_warning(f"Summary too short: {word_count} words")
    elif word_count > 500:
        # Truncate to 500 words
        summary = ' '.join(summary.split()[:500]) + "..."
    
    return summary


def extract_key_findings(synthesis_data: Dict) -> List[Finding]:
    """
    Identify 3-10 key findings with citations
    
    Preconditions:
        - synthesis_data contains summaries and sources
        - LLM is initialized
    
    Postconditions:
        - Returns list of 3-10 Finding objects
        - Each finding has at least one citation
        - Findings are ranked by importance
    """
    prompt = f"""
    Extract 3-10 key findings from this research data:
    
    Question: {synthesis_data['question']}
    
    Summaries:
    {format_summaries_for_prompt(synthesis_data['summaries'])}
    
    For each finding:
    1. State it clearly and concisely
    2. Indicate which sources support it (by URL)
    3. Rate confidence as high/medium/low
    
    Return as JSON array of findings.
    """
    
    response = llm_heavy.invoke(prompt)
    findings_raw = json.loads(response.content)
    
    findings = []
    for idx, finding_data in enumerate(findings_raw):
        finding = Finding(
            statement=finding_data['statement'],
            citations=finding_data['citations'],
            confidence=finding_data.get('confidence', 'medium')
        )
        findings.append(finding)
    
    # Ensure we have at least 3 findings
    assert len(findings) >= 3, "Must have at least 3 key findings"
    
    return findings


def compile_evidence(findings: List[Finding], synthesis_data: Dict) -> List[Evidence]:
    """
    Link findings to specific source excerpts
    
    Preconditions:
        - findings is non-empty list
        - synthesis_data contains summaries with sources
    
    Postconditions:
        - Returns list of Evidence objects
        - Each finding has at least one evidence item
    """
    evidence_list = []
    
    for finding_id, finding in enumerate(findings):
        # Find summaries that support this finding
        for citation_url in finding.citations:
            # Locate the summary for this citation
            matching_summary = next(
                (s for s in synthesis_data['summaries'] if s['source'] == citation_url),
                None
            )
            
            if matching_summary:
                # Extract relevant excerpt
                excerpt = extract_relevant_excerpt(
                    finding.statement,
                    matching_summary['summary']
                )
                
                evidence = Evidence(
                    finding_id=finding_id,
                    source=matching_summary['source'],
                    excerpt=excerpt,
                    url=citation_url
                )
                
                evidence_list.append(evidence)
    
    return evidence_list


def identify_limitations(critic_feedback: Dict) -> List[str]:
    """
    Document research limitations and gaps
    
    Preconditions:
        - critic_feedback is not None
        - critic_feedback contains gaps and quality_score
    
    Postconditions:
        - Returns list of limitation strings
        - Includes gaps identified by critic
    """
    limitations = []
    
    # Add gaps from critic
    if critic_feedback.get('gaps'):
        limitations.extend([
            f"Limited coverage: {gap}" for gap in critic_feedback['gaps']
        ])
    
    # Add contradictions as limitations
    if critic_feedback.get('contradictions'):
        limitations.append(
            f"Conflicting information found: {len(critic_feedback['contradictions'])} contradictions identified"
        )
    
    # Add quality-based limitations
    if critic_feedback['quality_score'] < 0.7:
        limitations.append(
            "Overall research quality could be improved with additional sources"
        )
    
    if critic_feedback['source_credibility'] < 0.7:
        limitations.append(
            "Some sources may have limited credibility; findings should be verified"
        )
    
    return limitations


def format_references(web_results: List[Dict], paper_results: List[Dict]) -> List[Reference]:
    """
    Create formatted citation list
    
    Preconditions:
        - web_results and paper_results are lists (may be empty)
    
    Postconditions:
        - Returns list of Reference objects
        - References are sorted by source type (papers first)
    """
    references = []
    
    # Add paper references
    for paper in paper_results:
        ref = Reference(
            id=paper['arxiv_id'],
            title=paper['title'],
            authors=paper['authors'],
            url=paper['url'],
            source_type="paper",
            accessed_date=datetime.utcnow().isoformat()
        )
        references.append(ref)
    
    # Add web references
    for web in web_results:
        ref = Reference(
            id=web['url'],
            title=web['title'],
            authors=[],  # Web sources typically don't have authors
            url=web['url'],
            source_type="web",
            accessed_date=datetime.utcnow().isoformat()
        )
        references.append(ref)
    
    return references
```


## Key Functions with Formal Specifications

### Function 1: build_langgraph_workflow()

```python
def build_langgraph_workflow(
    agents: Dict[str, BaseAgent],
    checkpointer: SqliteSaver
) -> StateGraph:
    """
    Construct LangGraph workflow with conditional routing
    """
```

**Preconditions:**
- `agents` dictionary contains all required agent instances: planner, web_search, paper_search, document_reader, critic, synthesizer
- Each agent is properly initialized with LLM instance
- `checkpointer` is valid SqliteSaver instance with database connection

**Postconditions:**
- Returns compiled StateGraph ready for execution
- Graph contains all agent nodes with proper edges
- Conditional routing from critic is configured
- Checkpointing is enabled for state persistence

**Loop Invariants:** N/A (no loops in function)

### Function 2: execute_agent_with_error_handling()

```python
async def execute_agent_with_error_handling(
    agent: BaseAgent,
    state: ResearchState
) -> ResearchState:
    """
    Execute agent with comprehensive error handling
    """
```

**Preconditions:**
- `agent` is valid BaseAgent instance
- `state` is valid ResearchState with all required fields
- `state.status` reflects current workflow stage

**Postconditions:**
- Returns updated ResearchState
- If agent succeeds: state contains agent's output
- If agent fails: state.error_log contains error message, state.status unchanged
- No exceptions propagate to caller

**Loop Invariants:** N/A

### Function 3: emit_sse_event()

```python
async def emit_sse_event(
    job_id: str,
    event_type: str,
    data: Dict
) -> None:
    """
    Emit Server-Sent Event to connected clients
    """
```

**Preconditions:**
- `job_id` is valid UUID string
- `event_type` is non-empty string
- `data` is JSON-serializable dictionary

**Postconditions:**
- SSE event is formatted and queued for transmission
- Event includes timestamp and job_id
- No exceptions raised on client disconnection

**Loop Invariants:** N/A

### Function 4: chunk_text()

```python
def chunk_text(text: str, chunk_size: int = 2000) -> List[str]:
    """
    Split long text into chunks for LLM processing
    """
```

**Preconditions:**
- `text` is non-empty string
- `chunk_size` is positive integer > 100

**Postconditions:**
- Returns list of text chunks
- Each chunk is <= chunk_size characters (except last chunk)
- Chunks preserve sentence boundaries where possible
- Concatenating chunks reconstructs original text

**Loop Invariants:**
- All processed chunks are <= chunk_size characters
- Total characters processed equals original text length


### Function 5: validate_research_state()

```python
def validate_research_state(state: ResearchState) -> bool:
    """
    Validate state integrity at workflow checkpoints
    """
```

**Preconditions:**
- `state` is ResearchState instance (may be partially populated)

**Postconditions:**
- Returns True if state is valid for current workflow stage
- Returns False if state has inconsistencies
- Logs validation errors for debugging

**Loop Invariants:**
- All validation checks are independent and order-agnostic

### Function 6: save_research_session()

```python
def save_research_session(state: ResearchState, db_session) -> None:
    """
    Persist research session to database
    """
```

**Preconditions:**
- `state` is valid ResearchState with job_id
- `db_session` is active SQLAlchemy session
- Database schema is initialized

**Postconditions:**
- ResearchSession record is created or updated in database
- If status is "complete" or "failed", completed_at is set
- Transaction is committed
- No exceptions on duplicate job_id (upsert behavior)

**Loop Invariants:** N/A

## Example Usage

### Example 1: Basic Research Query (Quick Mode)

```python
# Backend: Start research job
from fastapi import FastAPI
from backend.graph.research_graph import ResearchGraph

app = FastAPI()
research_graph = ResearchGraph(agents, checkpointer)

@app.post("/research")
async def create_research(request: ResearchRequest):
    job_id = str(uuid.uuid4())
    
    initial_state = ResearchState(
        job_id=job_id,
        question=request.question,
        depth=request.depth,
        plan=None,
        web_results=[],
        paper_results=[],
        document_summaries=[],
        critic_feedback=None,
        final_report=None,
        status="planning",
        current_node="",
        error_log=[],
        retry_count=0
    )
    
    # Submit to job queue
    await job_queue.submit_job(job_id, research_graph, initial_state)
    
    return {"job_id": job_id, "status": "started"}
```

### Example 2: Frontend SSE Connection

```typescript
// Frontend: Connect to SSE stream
const useResearchJob = (jobId: string) => {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/research/${jobId}/status`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update status
      setStatus({
        currentNode: data.node,
        status: data.status,
        progress: data.progress
      });
      
      // Add event to history
      setEvents(prev => [...prev, data]);
      
      // Close connection when complete
      if (data.status === 'complete' || data.status === 'failed') {
        eventSource.close();
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE connection failed');
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [jobId]);
  
  return { status, events };
};
```

### Example 3: Complete Workflow Execution

```python
# Complete research workflow
async def run_research(question: str, depth: str) -> FinalReport:
    # Initialize agents
    llm_heavy = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)
    llm_fast = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
    
    agents = {
        "planner": PlannerAgent(llm_heavy, "planner"),
        "web_search": WebSearchAgent(llm_fast, "web_search"),
        "paper_search": PaperSearchAgent(llm_fast, "paper_search"),
        "document_reader": DocumentReaderAgent(llm_fast, "document_reader"),
        "critic": CriticAgent(llm_heavy, "critic"),
        "synthesizer": SynthesisAgent(llm_heavy, "synthesizer")
    }
    
    # Build graph
    checkpointer = SqliteSaver.from_conn_string("checkpoints.db")
    graph = build_langgraph_workflow(agents, checkpointer)
    
    # Execute workflow
    initial_state = ResearchState(
        job_id=str(uuid.uuid4()),
        question=question,
        depth=depth,
        plan=None,
        web_results=[],
        paper_results=[],
        document_summaries=[],
        critic_feedback=None,
        final_report=None,
        status="planning",
        current_node="",
        error_log=[],
        retry_count=0
    )
    
    final_state = await graph.ainvoke(initial_state)
    
    return final_state['final_report']
```


## Correctness Properties

### Property 1: Workflow Completeness
**Universal Quantification**: ∀ research_job ∈ ResearchJobs, (status(research_job) = "complete") ⟹ (final_report(research_job) ≠ null ∧ |key_findings(research_job)| ≥ 3)

**Meaning**: Every completed research job must have a non-null final report with at least 3 key findings.

**Test Strategy**: Property-based test that generates random research questions and verifies all completed jobs have valid reports.

### Property 2: State Consistency
**Universal Quantification**: ∀ state ∈ WorkflowStates, (current_node(state) = "synthesizer") ⟹ (document_summaries(state) ≠ [] ∧ critic_feedback(state) ≠ null)

**Meaning**: When the workflow reaches the synthesizer node, document summaries and critic feedback must be populated.

**Test Strategy**: Unit test that checks state validity at each workflow transition.

### Property 3: Retry Limit
**Universal Quantification**: ∀ state ∈ WorkflowStates, retry_count(state) ≤ 1

**Meaning**: The workflow never retries more than once, preventing infinite loops.

**Test Strategy**: Property-based test that simulates critic feedback requiring retries and verifies count never exceeds 1.

### Property 4: Citation Integrity
**Universal Quantification**: ∀ finding ∈ KeyFindings, |citations(finding)| ≥ 1 ∧ (∀ citation ∈ citations(finding), citation ∈ references(report))

**Meaning**: Every finding must have at least one citation, and all citations must exist in the references list.

**Test Strategy**: Unit test that validates final report structure and cross-references citations.

### Property 5: Source Traceability
**Universal Quantification**: ∀ summary ∈ DocumentSummaries, ∃ source ∈ (WebResults ∪ PaperResults), source_url(summary) = url(source)

**Meaning**: Every document summary must trace back to an original web or paper source.

**Test Strategy**: Integration test that verifies all summaries have valid source URLs from search results.

### Property 6: Plan Coverage
**Universal Quantification**: ∀ plan ∈ ResearchPlans, 3 ≤ |sub_questions(plan)| ≤ 5

**Meaning**: Every research plan must contain between 3 and 5 sub-questions.

**Test Strategy**: Property-based test that generates various questions and verifies plan structure.

### Property 7: Error Resilience
**Universal Quantification**: ∀ agent ∈ Agents, (agent_fails(agent) ∧ retry_count < max_retries) ⟹ workflow_continues()

**Meaning**: If any agent fails and retries are available, the workflow continues rather than crashing.

**Test Strategy**: Fault injection test that simulates agent failures and verifies graceful degradation.

### Property 8: SSE Event Ordering
**Universal Quantification**: ∀ job ∈ ResearchJobs, events(job) = [e₁, e₂, ..., eₙ] ⟹ timestamp(e₁) ≤ timestamp(e₂) ≤ ... ≤ timestamp(eₙ)

**Meaning**: SSE events for a job are always emitted in chronological order.

**Test Strategy**: Integration test that captures SSE stream and verifies timestamp ordering.

### Property 9: Database Persistence
**Universal Quantification**: ∀ state ∈ WorkflowStates, (status(state) ∈ {"complete", "failed"}) ⟹ ∃ session ∈ DatabaseSessions, job_id(session) = job_id(state)

**Meaning**: All completed or failed research jobs are persisted to the database.

**Test Strategy**: Integration test that runs workflows and verifies database records exist.

### Property 10: Rate Limiting
**Universal Quantification**: ∀ time_window ∈ TimeWindows, |active_jobs(time_window)| ≤ max_concurrent_jobs

**Meaning**: The number of concurrent research jobs never exceeds the configured limit.

**Test Strategy**: Load test that submits many jobs simultaneously and verifies queue enforcement.


## Error Handling

### Error Scenario 1: LLM API Failure

**Condition**: Groq API returns error or times out during agent execution

**Response**: 
- Agent catches exception and logs error details
- Error message added to state.error_log
- Agent returns state with partial results if available
- Workflow continues with degraded data

**Recovery**:
- Retry with exponential backoff (max 3 attempts)
- If all retries fail, mark agent as failed but continue workflow
- Final report includes limitation noting LLM failure

### Error Scenario 2: Search API Failure

**Condition**: DuckDuckGo or ArXiv API is unavailable or rate-limited

**Response**:
- Search agent catches exception
- Logs error with timestamp and query details
- Returns empty results list for failed queries
- Other sub-questions continue processing

**Recovery**:
- Critic agent detects low coverage
- Triggers retry with alternative queries if retry_count < 1
- If retry also fails, proceed with available data
- Report documents limited search coverage

### Error Scenario 3: Document Download Failure

**Condition**: PDF download fails or content is inaccessible

**Response**:
- Document reader logs failed URL
- Skips to next document without crashing
- Uses paper abstract if PDF unavailable
- Continues with successfully downloaded documents

**Recovery**:
- No automatic retry for individual documents
- Critic may flag insufficient sources
- Report includes limitation about inaccessible sources

### Error Scenario 4: Invalid State Transition

**Condition**: Workflow attempts invalid state transition (e.g., synthesizer before critic)

**Response**:
- State validation detects inconsistency
- Logs error with current and expected state
- Raises WorkflowError exception
- Job status set to "failed"

**Recovery**:
- No automatic recovery (indicates bug)
- Error logged for debugging
- User notified of system error
- Session saved with error details

### Error Scenario 5: Database Connection Loss

**Condition**: SQLite database becomes unavailable during execution

**Response**:
- Checkpoint save fails
- Error logged but workflow continues
- In-memory state preserved
- Retry database save at next checkpoint

**Recovery**:
- Attempt reconnection with exponential backoff
- If persistent failure, complete workflow without persistence
- Final report still returned to user
- Warning logged about missing checkpoint

### Error Scenario 6: SSE Client Disconnection

**Condition**: Frontend client disconnects during research

**Response**:
- Backend detects closed connection
- Stops sending events to that client
- Research job continues running
- Results remain available via GET endpoint

**Recovery**:
- Client can reconnect and poll status endpoint
- Job history allows retrieving completed results
- No data loss from disconnection


### Error Scenario 7: Malformed LLM Response

**Condition**: LLM returns non-JSON or invalid JSON structure

**Response**:
- JSON parsing fails with exception
- Agent logs raw LLM response for debugging
- Attempts to extract partial data using regex
- If extraction fails, uses fallback default values

**Recovery**:
- Retry LLM call with more explicit prompt
- If retry fails, use heuristic-based fallback
- Document quality degradation in critic feedback
- Continue workflow with best-effort data

### Error Scenario 8: Rate Limit Exceeded

**Condition**: More than 5 concurrent jobs attempted

**Response**:
- Job queue rejects new submission
- Returns HTTP 429 (Too Many Requests)
- Provides estimated wait time in response
- Job not started or queued

**Recovery**:
- Frontend displays rate limit message
- User can retry after wait period
- No data loss or corruption
- Queue automatically accepts jobs when capacity available

## Testing Strategy

### Unit Testing Approach

**Scope**: Individual agent functions and utility methods

**Key Test Cases**:
1. **Planner Agent**:
   - Generates 3-5 sub-questions for various question types
   - Handles edge cases (very short/long questions)
   - Produces valid JSON plan structure

2. **Web Search Agent**:
   - Deduplicates results by URL
   - Handles empty search results gracefully
   - Extracts correct metadata from search results

3. **Paper Search Agent**:
   - Parses ArXiv API responses correctly
   - Handles papers with multiple authors
   - Extracts valid ArXiv IDs

4. **Document Reader Agent**:
   - Chunks long documents correctly
   - Preserves sentence boundaries
   - Generates summaries within word limits

5. **Critic Agent**:
   - Calculates coverage score accurately
   - Detects contradictions in summaries
   - Sets retry_needed flag appropriately

6. **Synthesis Agent**:
   - Generates reports with all required sections
   - Links citations to references correctly
   - Formats references consistently

**Coverage Goal**: >80% code coverage for all agent modules

**Tools**: pytest, pytest-cov, pytest-asyncio

### Property-Based Testing Approach

**Property Test Library**: Hypothesis (Python)

**Key Properties to Test**:

1. **Plan Generation Idempotence**:
   ```python
   @given(question=st.text(min_size=10, max_size=200))
   def test_plan_generation_deterministic(question):
       plan1 = planner.generate_plan(question, "quick")
       plan2 = planner.generate_plan(question, "quick")
       assert len(plan1['sub_questions']) == len(plan2['sub_questions'])
   ```

2. **State Transition Validity**:
   ```python
   @given(state=research_state_strategy())
   def test_state_transitions_valid(state):
       next_state = execute_next_node(state)
       assert is_valid_transition(state.status, next_state.status)
   ```

3. **Citation Integrity**:
   ```python
   @given(report=final_report_strategy())
   def test_all_citations_in_references(report):
       all_citations = [c for f in report.key_findings for c in f.citations]
       reference_urls = [r.url for r in report.references]
       assert all(citation in reference_urls for citation in all_citations)
   ```

4. **Retry Count Bounds**:
   ```python
   @given(initial_state=research_state_strategy())
   def test_retry_count_never_exceeds_one(initial_state):
       final_state = run_workflow(initial_state)
       assert final_state.retry_count <= 1
   ```

5. **Summary Word Count**:
   ```python
   @given(text=st.text(min_size=1000, max_size=10000))
   def test_summary_within_limits(text):
       summary = generate_summary(text)
       word_count = len(summary.split())
       assert 200 <= word_count <= 500
   ```

**Coverage Goal**: All critical invariants tested with 1000+ generated examples

### Integration Testing Approach

**Scope**: End-to-end workflow execution with real external services

**Key Test Cases**:

1. **Complete Workflow Execution**:
   - Submit research question via API
   - Verify all agents execute in correct order
   - Confirm final report structure
   - Check database persistence

2. **SSE Event Stream**:
   - Connect to status endpoint
   - Verify events received in order
   - Confirm event data matches state
   - Test client disconnection handling

3. **Parallel Agent Execution**:
   - Verify web and paper search run concurrently
   - Confirm results merged correctly
   - Check no race conditions in state updates

4. **Retry Logic**:
   - Simulate low-quality initial results
   - Verify critic triggers retry
   - Confirm retry executes only once
   - Check final report includes retry data

5. **Error Recovery**:
   - Inject failures in various agents
   - Verify workflow continues
   - Confirm error logging
   - Check degraded results still produced

6. **Rate Limiting**:
   - Submit 10 concurrent jobs
   - Verify only 5 execute simultaneously
   - Confirm queue management
   - Check jobs complete successfully

**Tools**: pytest, httpx (async HTTP client), pytest-docker

**Test Environment**: Docker Compose with all services


## Performance Considerations

### LLM API Latency

**Challenge**: Groq API calls can take 2-10 seconds per request

**Optimization Strategies**:
- Use faster llama-3.1-8b-instant model for simple tasks (search, reading)
- Reserve llama-3.3-70b-versatile for complex reasoning (planning, critique, synthesis)
- Implement request batching where possible
- Cache common query patterns (future enhancement)

**Expected Performance**:
- Quick mode: 30-60 seconds total
- Deep mode: 60-120 seconds total

### Parallel Agent Execution

**Challenge**: Sequential execution would be too slow

**Optimization Strategies**:
- Execute Web Search and Paper Search agents in parallel using asyncio.gather()
- Process multiple document summaries concurrently
- Use async/await throughout backend for non-blocking I/O

**Expected Improvement**: 40-50% reduction in total execution time

### Document Processing

**Challenge**: Large PDFs can exceed LLM context limits

**Optimization Strategies**:
- Chunk documents into 2000-character segments
- Process chunks in parallel
- Summarize chunks before final synthesis
- Skip documents >10MB to prevent timeouts

**Expected Performance**: Process 5-10 documents in 20-30 seconds

### Database Query Optimization

**Challenge**: History queries could become slow with many sessions

**Optimization Strategies**:
- Index job_id and created_at columns
- Limit history queries to most recent 50 sessions
- Use pagination for large result sets
- Implement database connection pooling

**Expected Performance**: History queries <100ms

### SSE Stream Efficiency

**Challenge**: Multiple concurrent SSE connections consume resources

**Optimization Strategies**:
- Limit SSE connections to 100 concurrent clients
- Use event buffering to batch updates
- Implement connection timeout (5 minutes)
- Close connections immediately on job completion

**Expected Performance**: Support 50+ concurrent research jobs with SSE

### Frontend Rendering

**Challenge**: Large reports can cause UI lag

**Optimization Strategies**:
- Virtualize long reference lists
- Lazy-load report sections
- Debounce SSE event rendering
- Use React.memo for expensive components

**Expected Performance**: Smooth 60fps rendering even with 100+ references


## Security Considerations

### API Key Protection

**Threat**: Exposure of Groq API key could lead to unauthorized usage

**Mitigation**:
- Store GROQ_API_KEY in environment variables only
- Never commit .env file to version control
- Use .env.example as template without real keys
- Implement key rotation capability
- Monitor API usage for anomalies

### Input Validation

**Threat**: Malicious input could cause injection attacks or DoS

**Mitigation**:
- Validate research question length (max 500 characters)
- Sanitize all user input before LLM processing
- Implement rate limiting per IP address
- Reject questions with suspicious patterns (SQL, script tags)
- Use Pydantic models for strict type validation

### CORS Configuration

**Threat**: Unauthorized domains could access API

**Mitigation**:
- Configure CORS to allow only frontend domain
- Use environment variable for allowed origins
- Implement CSRF tokens for state-changing operations
- Require authentication for production deployment (future)

### LLM Prompt Injection

**Threat**: User could craft questions to manipulate agent behavior

**Mitigation**:
- Use structured prompts with clear delimiters
- Validate LLM responses against expected schemas
- Implement output filtering for sensitive content
- Log suspicious prompt patterns
- Use separate system and user message roles

### Data Privacy

**Threat**: Research questions and results could contain sensitive information

**Mitigation**:
- Implement optional data retention policies
- Provide session deletion capability
- Encrypt database at rest (production)
- Anonymize logs (remove PII)
- Add privacy notice in UI

### Dependency Vulnerabilities

**Threat**: Third-party packages could have security flaws

**Mitigation**:
- Pin all dependency versions in requirements.txt
- Run security audits with pip-audit or safety
- Update dependencies regularly
- Use official Docker base images
- Scan containers for vulnerabilities

### Rate Limiting Bypass

**Threat**: Attackers could overwhelm system with requests

**Mitigation**:
- Implement IP-based rate limiting
- Use token bucket algorithm for fairness
- Add CAPTCHA for suspicious traffic patterns
- Monitor for distributed attacks
- Implement exponential backoff for repeated violations

### Database Injection

**Threat**: SQL injection through user input

**Mitigation**:
- Use SQLAlchemy ORM exclusively (no raw SQL)
- Parameterize all queries
- Validate all input with Pydantic
- Use least-privilege database user
- Enable query logging for auditing


## Dependencies

### Backend Dependencies

**Core Framework**:
- `fastapi==0.104.1` - Web framework for REST API
- `uvicorn[standard]==0.24.0` - ASGI server
- `pydantic==2.5.0` - Data validation and settings

**LangChain & LLM**:
- `langchain==0.1.0` - LLM framework
- `langchain-groq==0.0.1` - Groq integration
- `langgraph==0.0.20` - Agent orchestration
- `groq==0.4.0` - Groq Python SDK

**Search & Data Sources**:
- `duckduckgo-search==4.1.0` - Web search (no API key)
- `arxiv==2.1.0` - Academic paper search
- `wikipedia-api==0.6.0` - Wikipedia access
- `PyMuPDF==1.23.8` - PDF processing

**Database**:
- `sqlalchemy==2.0.23` - ORM
- `aiosqlite==0.19.0` - Async SQLite driver

**Utilities**:
- `python-dotenv==1.0.0` - Environment variable management
- `httpx==0.25.2` - Async HTTP client
- `beautifulsoup4==4.12.2` - HTML parsing
- `python-multipart==0.0.6` - Form data parsing

**Development**:
- `pytest==7.4.3` - Testing framework
- `pytest-asyncio==0.21.1` - Async test support
- `pytest-cov==4.1.0` - Coverage reporting
- `hypothesis==6.92.0` - Property-based testing
- `black==23.12.0` - Code formatting
- `ruff==0.1.8` - Linting

### Frontend Dependencies

**Core Framework**:
- `react@18.2.0` - UI library
- `react-dom@18.2.0` - React DOM rendering
- `vite@5.0.0` - Build tool and dev server

**UI Components**:
- `reactflow@11.10.0` - Agent graph visualization
- `tailwindcss@3.3.6` - CSS framework
- `@headlessui/react@1.7.17` - Accessible UI components
- `lucide-react@0.294.0` - Icon library

**State Management**:
- `zustand@4.4.7` - Lightweight state management (optional)

**HTTP & SSE**:
- `axios@1.6.2` - HTTP client
- Native EventSource API for SSE

**Development**:
- `typescript@5.3.3` - Type checking
- `@types/react@18.2.43` - React type definitions
- `@types/react-dom@18.2.17` - React DOM types
- `eslint@8.55.0` - Linting
- `prettier@3.1.1` - Code formatting
- `@vitejs/plugin-react@4.2.1` - Vite React plugin

### Infrastructure Dependencies

**Docker**:
- `python:3.11-slim` - Base image for backend
- `node:20-alpine` - Base image for frontend
- `docker-compose@2.23.0` - Multi-container orchestration

**System Requirements**:
- Python 3.11+
- Node.js 20+
- Docker 24+
- 4GB RAM minimum
- 10GB disk space

### External Services

**Required**:
- Groq API (requires API key) - LLM inference
- DuckDuckGo Search (no key required) - Web search
- ArXiv API (no key required) - Academic papers
- Wikipedia API (no key required) - Encyclopedia data

**Optional**:
- Sentry (error tracking) - Production monitoring
- Prometheus (metrics) - Performance monitoring

### Environment Variables

Required in `.env` file:
```bash
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional
DATABASE_URL=sqlite:///./research.db
CHECKPOINT_DB_URL=sqlite:///./checkpoints.db
MAX_CONCURRENT_JOBS=5
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```


## Deployment Architecture

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - DATABASE_URL=sqlite:///./data/research.db
      - CHECKPOINT_DB_URL=sqlite:///./data/checkpoints.db
    volumes:
      - ./backend:/app
      - backend-data:/app/data
    depends_on:
      - frontend
    networks:
      - research-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - research-network

volumes:
  backend-data:

networks:
  research-network:
    driver: bridge
```

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev", "--", "--host"]
```

### Production Considerations

**Scaling**:
- Deploy backend as multiple replicas behind load balancer
- Use Redis for shared job queue state
- Implement distributed checkpointing
- Use PostgreSQL instead of SQLite for production

**Monitoring**:
- Add health check endpoints (`/health`, `/ready`)
- Integrate Prometheus metrics
- Set up Grafana dashboards
- Configure alerting for failures

**Security**:
- Use HTTPS with TLS certificates
- Implement authentication (OAuth2, JWT)
- Add API gateway for rate limiting
- Enable database encryption at rest

**Backup**:
- Automated database backups every 6 hours
- Checkpoint data retention policy
- Export research sessions to S3/cloud storage
- Disaster recovery plan


## Prompt Engineering Strategy

### Externalized Prompt Management

All agent prompts are stored in `backend/prompts/` directory as separate files for easy modification without code changes.

**Directory Structure**:
```
backend/prompts/
├── planner_prompt.txt
├── web_search_prompt.txt
├── paper_search_prompt.txt
├── document_reader_prompt.txt
├── critic_prompt.txt
└── synthesis_prompt.txt
```

### Planner Prompt Template

**File**: `backend/prompts/planner_prompt.txt`

```
You are a research planning expert. Your task is to break down a complex research question into {num_questions} focused sub-questions that can be answered through web search and academic papers.

Research Question: {question}
Research Depth: {depth}

Requirements:
1. Generate exactly {num_questions} sub-questions
2. Each sub-question should be specific and answerable
3. Sub-questions should collectively cover all aspects of the main question
4. Avoid redundancy between sub-questions
5. Prioritize questions that can be answered with factual information

Output Format (JSON):
{{
  "sub_questions": ["question 1", "question 2", ...],
  "strategy": "quick" or "deep",
  "estimated_time": <seconds>,
  "search_keywords": ["keyword1", "keyword2", ...]
}}

Generate the research plan now:
```

### Critic Prompt Template

**File**: `backend/prompts/critic_prompt.txt`

```
You are a research quality evaluator. Analyze the gathered research data and identify gaps, contradictions, and quality issues.

Original Question: {question}
Sub-Questions: {sub_questions}
Number of Sources: {num_sources}

Document Summaries:
{summaries}

Evaluation Criteria:
1. Coverage: Are all sub-questions adequately answered?
2. Contradictions: Do any sources conflict with each other?
3. Source Quality: Are sources credible and authoritative?
4. Completeness: Is there missing critical information?

Output Format (JSON):
{{
  "gaps": ["description of gap 1", "description of gap 2", ...],
  "contradictions": ["contradiction 1", "contradiction 2", ...],
  "retry_queries": ["refined query 1", "refined query 2", ...],
  "overall_assessment": "brief assessment"
}}

Provide your evaluation now:
```

### Synthesis Prompt Template

**File**: `backend/prompts/synthesis_prompt.txt`

```
You are a research synthesis expert. Create a comprehensive, well-structured research report based on the gathered information.

Research Question: {question}

Available Data:
- Web Results: {num_web_results}
- Academic Papers: {num_papers}
- Document Summaries: {num_summaries}

Summaries:
{formatted_summaries}

Report Requirements:
1. Executive Summary (200-500 words): Directly answer the research question
2. Key Findings (3-10 findings): Main discoveries with citations
3. Supporting Evidence: Link findings to specific sources
4. Limitations: Acknowledge gaps and uncertainties
5. References: All cited sources in consistent format

Output Format (JSON):
{{
  "summary": "executive summary text",
  "key_findings": [
    {{"statement": "finding text", "citations": ["url1", "url2"], "confidence": "high/medium/low"}}
  ],
  "limitations": ["limitation 1", "limitation 2"]
}}

Generate the research report now:
```

### Prompt Best Practices

**Clarity**:
- Use clear, unambiguous instructions
- Specify exact output format (JSON schema)
- Provide examples when helpful

**Consistency**:
- Use consistent terminology across all prompts
- Maintain similar structure for all agent prompts
- Standardize JSON output formats

**Flexibility**:
- Use template variables for dynamic content
- Support both quick and deep research modes
- Allow for graceful degradation

**Safety**:
- Include output validation instructions
- Specify constraints (word counts, list lengths)
- Request structured data over free-form text


## LangGraph Implementation Details

### Graph Construction

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

def build_research_graph(agents: Dict[str, BaseAgent]) -> StateGraph:
    """
    Construct LangGraph workflow with conditional routing
    
    Graph Structure:
    START -> planner -> [web_search, paper_search] -> document_reader -> critic
    critic -> (if retry_needed) web_search -> document_reader -> critic
    critic -> (if complete) synthesizer -> END
    """
    # Initialize graph with state schema
    workflow = StateGraph(ResearchState)
    
    # Add agent nodes
    workflow.add_node("planner", agents["planner"].execute)
    workflow.add_node("web_search", agents["web_search"].execute)
    workflow.add_node("paper_search", agents["paper_search"].execute)
    workflow.add_node("document_reader", agents["document_reader"].execute)
    workflow.add_node("critic", agents["critic"].execute)
    workflow.add_node("synthesizer", agents["synthesizer"].execute)
    
    # Set entry point
    workflow.set_entry_point("planner")
    
    # Add edges
    workflow.add_edge("planner", "web_search")
    workflow.add_edge("planner", "paper_search")
    workflow.add_edge("web_search", "document_reader")
    workflow.add_edge("paper_search", "document_reader")
    workflow.add_edge("document_reader", "critic")
    
    # Conditional routing from critic
    workflow.add_conditional_edges(
        "critic",
        route_after_critic,
        {
            "retry": "web_search",
            "synthesize": "synthesizer"
        }
    )
    
    # End after synthesis
    workflow.add_edge("synthesizer", END)
    
    return workflow


def route_after_critic(state: ResearchState) -> str:
    """
    Determine next node after critic evaluation
    
    Returns:
        "retry" if gaps found and retry_count < 1
        "synthesize" if quality sufficient or max retries reached
    """
    if state.critic_feedback is None:
        return "synthesize"
    
    retry_needed = state.critic_feedback.get("retry_needed", False)
    can_retry = state.retry_count < 1
    
    if retry_needed and can_retry:
        return "retry"
    else:
        return "synthesize"
```

### Checkpointing Configuration

```python
from langgraph.checkpoint.sqlite import SqliteSaver

# Initialize SQLite checkpointer
checkpointer = SqliteSaver.from_conn_string("checkpoints.db")

# Compile graph with checkpointing
compiled_graph = workflow.compile(checkpointer=checkpointer)

# Execute with checkpoint support
config = {"configurable": {"thread_id": job_id}}
final_state = await compiled_graph.ainvoke(initial_state, config=config)

# Resume from checkpoint after failure
resumed_state = await compiled_graph.ainvoke(
    None,  # State loaded from checkpoint
    config={"configurable": {"thread_id": job_id}}
)
```

### State Update Patterns

```python
def update_state_safely(state: ResearchState, updates: Dict) -> ResearchState:
    """
    Update state with validation
    
    Ensures:
    - Required fields are not removed
    - Type consistency is maintained
    - Immutable fields are not changed (job_id)
    """
    # Create new state dict
    new_state = state.copy()
    
    # Apply updates
    for key, value in updates.items():
        if key == "job_id":
            raise ValueError("Cannot modify job_id")
        new_state[key] = value
    
    # Validate updated state
    validate_research_state(new_state)
    
    return new_state
```

### Parallel Execution Pattern

```python
import asyncio

async def execute_parallel_search(state: ResearchState) -> ResearchState:
    """
    Execute web and paper search in parallel
    
    LangGraph automatically handles this when both nodes
    depend on the same parent (planner) and have no
    dependencies on each other.
    """
    # This is handled automatically by LangGraph's execution engine
    # when graph structure has parallel edges
    pass

# Manual parallel execution (if needed outside graph)
async def manual_parallel_execution(state: ResearchState) -> ResearchState:
    web_task = asyncio.create_task(web_search_agent.execute(state))
    paper_task = asyncio.create_task(paper_search_agent.execute(state))
    
    web_state, paper_state = await asyncio.gather(web_task, paper_task)
    
    # Merge results
    state.web_results = web_state.web_results
    state.paper_results = paper_state.paper_results
    
    return state
```

### Error Handling in Graph

```python
def create_error_handling_wrapper(agent: BaseAgent):
    """
    Wrap agent execution with error handling
    """
    async def wrapped_execute(state: ResearchState) -> ResearchState:
        try:
            return await agent.execute(state)
        except Exception as e:
            logger.error(f"Agent {agent.name} failed: {str(e)}")
            state.error_log.append(f"{agent.name}: {str(e)}")
            # Return state with error logged but continue workflow
            return state
    
    return wrapped_execute

# Apply wrapper to all agents
wrapped_agents = {
    name: create_error_handling_wrapper(agent)
    for name, agent in agents.items()
}
```


## Logging and Monitoring

### Structured Logging Configuration

```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """Format logs as JSON for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, "job_id"):
            log_data["job_id"] = record.job_id
        if hasattr(record, "agent"):
            log_data["agent"] = record.agent
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO"):
    """Configure application logging"""
    logger = logging.getLogger("research_assistant")
    logger.setLevel(log_level)
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)
    
    # File handler for persistent logs
    file_handler = logging.FileHandler("logs/research_assistant.log")
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)
    
    return logger
```

### Agent Execution Logging

```python
import time
from functools import wraps

def log_agent_execution(func):
    """Decorator to log agent execution metrics"""
    @wraps(func)
    async def wrapper(self, state: ResearchState):
        logger = logging.getLogger("research_assistant")
        start_time = time.time()
        
        logger.info(
            f"Agent {self.name} starting",
            extra={
                "job_id": state.job_id,
                "agent": self.name,
                "status": state.status
            }
        )
        
        try:
            result = await func(self, state)
            duration_ms = (time.time() - start_time) * 1000
            
            logger.info(
                f"Agent {self.name} completed",
                extra={
                    "job_id": state.job_id,
                    "agent": self.name,
                    "duration_ms": duration_ms,
                    "status": "success"
                }
            )
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            logger.error(
                f"Agent {self.name} failed: {str(e)}",
                extra={
                    "job_id": state.job_id,
                    "agent": self.name,
                    "duration_ms": duration_ms,
                    "status": "failed"
                },
                exc_info=True
            )
            
            raise
    
    return wrapper
```

### API Request Logging

```python
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests with timing"""
    logger = logging.getLogger("research_assistant")
    start_time = time.time()
    
    # Log request
    logger.info(
        f"Request started: {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host
        }
    )
    
    # Process request
    response = await call_next(request)
    
    # Log response
    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        f"Request completed: {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms
        }
    )
    
    return response
```

### Metrics Collection

```python
from dataclasses import dataclass
from typing import Dict
import statistics

@dataclass
class ResearchMetrics:
    """Metrics for a completed research job"""
    job_id: str
    total_duration_ms: float
    agent_durations: Dict[str, float]
    num_web_results: int
    num_paper_results: int
    num_summaries: int
    quality_score: float
    retry_count: int
    error_count: int


class MetricsCollector:
    """Collect and aggregate research metrics"""
    
    def __init__(self):
        self.metrics: List[ResearchMetrics] = []
    
    def record_job(self, metrics: ResearchMetrics):
        """Record metrics for completed job"""
        self.metrics.append(metrics)
        
        logger = logging.getLogger("research_assistant")
        logger.info(
            "Job metrics recorded",
            extra={
                "job_id": metrics.job_id,
                "total_duration_ms": metrics.total_duration_ms,
                "quality_score": metrics.quality_score,
                "num_sources": metrics.num_web_results + metrics.num_paper_results
            }
        )
    
    def get_summary_stats(self) -> Dict:
        """Calculate summary statistics"""
        if not self.metrics:
            return {}
        
        return {
            "total_jobs": len(self.metrics),
            "avg_duration_ms": statistics.mean(m.total_duration_ms for m in self.metrics),
            "avg_quality_score": statistics.mean(m.quality_score for m in self.metrics),
            "avg_sources_per_job": statistics.mean(
                m.num_web_results + m.num_paper_results for m in self.metrics
            ),
            "total_errors": sum(m.error_count for m in self.metrics),
            "retry_rate": sum(1 for m in self.metrics if m.retry_count > 0) / len(self.metrics)
        }
```

### Health Check Endpoints

```python
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check with dependency validation"""
    checks = {
        "database": check_database_connection(),
        "groq_api": check_groq_api(),
        "job_queue": check_job_queue()
    }
    
    all_ready = all(checks.values())
    status_code = 200 if all_ready else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ready else "not_ready",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


def check_database_connection() -> bool:
    """Verify database is accessible"""
    try:
        db.execute("SELECT 1")
        return True
    except Exception:
        return False


def check_groq_api() -> bool:
    """Verify Groq API is accessible"""
    try:
        llm = ChatGroq(model="llama-3.1-8b-instant")
        llm.invoke("test")
        return True
    except Exception:
        return False


def check_job_queue() -> bool:
    """Verify job queue is operational"""
    return len(job_queue.active_jobs) < job_queue.max_concurrent
```


## Future Enhancements

### Phase 2 Features

1. **User Authentication**:
   - OAuth2 integration (Google, GitHub)
   - User-specific research history
   - Private research sessions
   - API key management per user

2. **Advanced Search Capabilities**:
   - Custom search source selection
   - Date range filtering for results
   - Language-specific searches
   - Domain whitelisting/blacklisting

3. **Report Customization**:
   - Export formats (PDF, Markdown, LaTeX)
   - Custom report templates
   - Citation style selection (APA, MLA, Chicago)
   - Interactive visualizations

4. **Collaborative Features**:
   - Share research sessions via link
   - Collaborative annotations
   - Team workspaces
   - Comment threads on findings

5. **Enhanced Agent Capabilities**:
   - Code execution agent for technical research
   - Image analysis agent for visual content
   - Data visualization agent for statistics
   - Translation agent for multilingual sources

### Phase 3 Features

1. **Advanced LLM Integration**:
   - Multi-model support (GPT-4, Claude, Gemini)
   - Model selection per agent
   - Ensemble voting for critical decisions
   - Fine-tuned models for specific domains

2. **Knowledge Graph**:
   - Build persistent knowledge graph from research
   - Entity extraction and linking
   - Relationship mapping
   - Cross-research insights

3. **Automated Fact-Checking**:
   - Cross-reference claims across sources
   - Detect misinformation patterns
   - Credibility scoring with explanations
   - Source bias detection

4. **Research Templates**:
   - Pre-built templates for common research types
   - Literature review template
   - Market research template
   - Technical comparison template
   - Trend analysis template

5. **API and Integrations**:
   - Public API for programmatic access
   - Slack/Discord bot integration
   - Notion/Obsidian export
   - Zapier/Make.com connectors

### Performance Optimizations

1. **Caching Layer**:
   - Redis cache for common queries
   - LLM response caching
   - Search result caching (24-hour TTL)
   - Embedding cache for similarity search

2. **Distributed Processing**:
   - Celery task queue for background jobs
   - Multi-worker deployment
   - Load balancing across instances
   - Horizontal scaling support

3. **Database Optimization**:
   - PostgreSQL for production
   - Full-text search indexing
   - Query optimization
   - Connection pooling

4. **Frontend Optimization**:
   - Code splitting and lazy loading
   - Service worker for offline support
   - Progressive Web App (PWA)
   - WebSocket for real-time updates

### Research Quality Improvements

1. **Source Diversity**:
   - Google Scholar integration
   - PubMed for medical research
   - Patent databases
   - News APIs (NewsAPI, GDELT)
   - Social media sentiment analysis

2. **Advanced NLP**:
   - Named entity recognition
   - Sentiment analysis
   - Topic modeling
   - Summarization quality scoring

3. **Citation Analysis**:
   - Citation network visualization
   - Impact factor consideration
   - Recency weighting
   - Author credibility scoring

4. **Bias Detection**:
   - Political bias detection
   - Source diversity metrics
   - Perspective balancing
   - Controversy flagging


## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd research-assistant

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add GROQ_API_KEY

# Run backend
uvicorn main:app --reload --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env if needed

# Run frontend
npm run dev

# Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Docker Development

```bash
# Build and run all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build backend
docker-compose up backend
```

### Testing Workflow

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_agents.py -v

# Run property-based tests
pytest tests/test_properties.py -v --hypothesis-show-statistics

# Frontend tests
cd frontend
npm test

# Run with coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

### Code Quality Checks

```bash
# Backend linting and formatting
cd backend
black .
ruff check .
mypy .

# Frontend linting and formatting
cd frontend
npm run lint
npm run format
npm run type-check
```

### Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/agent-improvements
# Make changes
git add .
git commit -m "feat: improve critic agent evaluation"
git push origin feature/agent-improvements
# Create pull request

# Commit message conventions
# feat: New feature
# fix: Bug fix
# docs: Documentation changes
# test: Test additions/changes
# refactor: Code refactoring
# perf: Performance improvements
# chore: Build/tooling changes
```

### Release Process

```bash
# Version bump
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Build production images
docker build -t research-assistant-backend:1.0.0 ./backend
docker build -t research-assistant-frontend:1.0.0 ./frontend

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting Guide

### Common Issues

**Issue 1: Groq API Rate Limit**
- **Symptom**: 429 errors in logs
- **Solution**: Implement exponential backoff, reduce concurrent jobs
- **Prevention**: Monitor API usage, implement request queuing

**Issue 2: SSE Connection Drops**
- **Symptom**: Frontend stops receiving updates
- **Solution**: Implement automatic reconnection with exponential backoff
- **Prevention**: Add connection heartbeat, increase timeout

**Issue 3: Database Lock Errors**
- **Symptom**: SQLite database locked errors
- **Solution**: Reduce concurrent writes, increase timeout
- **Prevention**: Use PostgreSQL for production, implement write queue

**Issue 4: Memory Leaks**
- **Symptom**: Backend memory usage grows over time
- **Solution**: Restart service, investigate with memory profiler
- **Prevention**: Implement proper cleanup, limit cache size

**Issue 5: Slow Research Jobs**
- **Symptom**: Jobs take >5 minutes to complete
- **Solution**: Check LLM API latency, reduce document count
- **Prevention**: Implement timeouts, optimize prompts

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable LangChain debug mode
import langchain
langchain.debug = True

# Enable FastAPI debug mode
app = FastAPI(debug=True)
```

### Performance Profiling

```python
# Profile agent execution
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Run research workflow
result = await research_graph.ainvoke(initial_state)

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

## Conclusion

This design document provides a comprehensive blueprint for building a full-stack Multi-Agent Research Assistant using LangGraph, FastAPI, and React. The system leverages specialized AI agents orchestrated through LangGraph to autonomously conduct research, critically evaluate findings, and synthesize structured reports with citations.

Key architectural decisions include:
- **Agent-based architecture** for modularity and specialization
- **LangGraph orchestration** for complex workflow management with checkpointing
- **Groq LLM API** for fast, cost-effective inference
- **Server-Sent Events** for real-time progress updates
- **SQLite/PostgreSQL** for persistence and session management
- **Docker containerization** for consistent deployment

The design emphasizes error resilience, performance optimization, security best practices, and comprehensive testing strategies to ensure a production-ready system.

