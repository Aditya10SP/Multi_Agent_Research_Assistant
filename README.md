# Multi-Agent Research Assistant

A full-stack AI-powered research application that autonomously conducts comprehensive research using specialized agents orchestrated by LangGraph. The system takes a research question, breaks it down into sub-tasks, gathers information from multiple sources (web, academic papers), critically evaluates findings, and produces a structured, cited research report.

## Features

- **Multi-Agent Architecture**: 6 specialized AI agents (Planner, Web Search, Paper Search, Document Reader, Critic, Synthesizer)
- **LangGraph Orchestration**: Conditional workflow with parallel execution and automatic retries
- **Real-time Updates**: Server-Sent Events (SSE) stream progress to frontend
- **Multiple Sources**: DuckDuckGo web search, ArXiv academic papers, Wikipedia
- **Quality Control**: Critic agent evaluates research quality and identifies gaps
- **Interactive UI**: React-based interface with live agent visualization using React Flow
- **Research History**: SQLite database stores past research sessions
- **Dark Mode**: Professional dark theme by default

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite + TailwindCSS)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Search Bar | Agent Graph Visualizer | Intermediate Results | History Sidebar  │
│                          Report Viewer (Collapsible Sections)                   │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ HTTP/REST + SSE
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                           BACKEND (FastAPI + Python)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  REST API | Job Queue Manager (max 5 concurrent) | SSE Event Stream            │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                      LANGGRAPH AGENT ORCHESTRATION                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Planner → [Web Search + Paper Search] → Document Reader → Critic → Synthesizer│
│  (Conditional retry if gaps found, max 1 retry)                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **Python 3.11+**
- **FastAPI** - REST API and SSE endpoints
- **LangGraph** - Agent workflow orchestration
- **LangChain** - LLM framework
- **Groq API** - LLM inference (llama-3.3-70b-versatile, llama-3.1-8b-instant)
- **DuckDuckGo Search** - Web search (no API key required)
- **ArXiv API** - Academic papers
- **Wikipedia API** - Encyclopedia data
- **SQLite + SQLAlchemy** - Database and session persistence

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Flow** - Agent graph visualization
- **Axios** - HTTP client
- **Lucide React** - Icons

### Deployment
- **Docker + Docker Compose** - Containerization

## Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- Docker and Docker Compose (for containerized deployment)
- Groq API key (get one at https://console.groq.com)

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd MultiAgentResearchAssistant
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

3. **Start the application**
```bash
docker-compose up --build
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Local Development

#### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

5. **Run the backend**
```bash
python main.py
```

Backend will be available at http://localhost:8000

#### Frontend Setup

1. **Navigate to frontend directory** (new terminal)
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Run the frontend**
```bash
npm run dev
```

Frontend will be available at http://localhost:5173

## Usage

### Starting a Research Query

1. Enter your research question in the search bar
2. Select research depth:
   - **Quick**: 3 sub-questions, faster results (~30-60 seconds)
   - **Deep**: 5 sub-questions, more comprehensive (~60-120 seconds)
3. Click "Research" button
4. Watch real-time progress in the agent graph and intermediate results panel
5. View the final structured report when complete

### Example Research Questions

- "What are the latest developments in quantum computing?"
- "How does climate change affect ocean ecosystems?"
- "What are the benefits and risks of artificial intelligence in healthcare?"
- "Explain the current state of renewable energy technology"
- "What are the main theories about dark matter?"

### Understanding the Agent Workflow

1. **Planner Agent** - Breaks your question into 3-5 focused sub-questions
2. **Web Search Agent** - Searches DuckDuckGo for recent articles (parallel)
3. **Paper Search Agent** - Queries ArXiv for academic papers (parallel)
4. **Document Reader Agent** - Extracts and summarizes key points from sources
5. **Critic Agent** - Evaluates quality, identifies gaps, decides if retry needed
6. **Synthesis Agent** - Generates final structured report with citations

### Report Structure

The final report includes:
- **Summary**: Executive summary (200-500 words) answering your question
- **Key Findings**: 3-10 main discoveries with confidence levels and citations
- **Limitations**: Acknowledged gaps and uncertainties
- **References**: All cited sources (web and academic papers)

## API Endpoints

### POST /research
Start a new research job
```json
{
  "question": "Your research question",
  "depth": "quick"  // or "deep"
}
```

Response:
```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "Research job started successfully"
}
```

### GET /research/{job_id}/status
Server-Sent Events stream of job progress
- Returns real-time updates as agents complete their work
- Automatically closes when job is complete or failed

### GET /research/{job_id}/report
Retrieve final research report
```json
{
  "job_id": "uuid",
  "question": "Your question",
  "report": {
    "summary": "...",
    "key_findings": [...],
    "limitations": [...],
    "references": [...]
  },
  "status": "complete"
}
```

### GET /research/history
List past research sessions (most recent 50)

### GET /health
Health check endpoint

## Configuration

### Environment Variables

**Backend (.env)**
```bash
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=sqlite:///./data/research.db
CHECKPOINT_DB_URL=sqlite:///./data/checkpoints.db
MAX_CONCURRENT_JOBS=5
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

### LLM Configuration

The system uses two Groq models for optimal performance:

- **llama-3.3-70b-versatile** (heavy model)
  - Used for: Planner, Critic, Synthesizer agents
  - Temperature: 0.3
  - Best for complex reasoning and synthesis

- **llama-3.1-8b-instant** (fast model)
  - Used for: Web Search, Paper Search, Document Reader agents
  - Temperature: 0.1
  - Best for quick extraction and summarization

### Customizing Prompts

All agent prompts are externalized in `backend/prompts/` directory:
- `planner_prompt.txt` - Research planning
- `critic_prompt.txt` - Quality evaluation
- `synthesis_prompt.txt` - Report generation

Edit these files to customize agent behavior without changing code.

## Project Structure

```
MultiAgentResearchAssistant/
├── backend/
│   ├── agents/
│   │   ├── planner.py           # Planner agent
│   │   ├── web_search.py        # Web search agent
│   │   ├── paper_search.py      # Paper search agent
│   │   ├── document_reader.py   # Document reader agent
│   │   ├── critic.py            # Critic agent
│   │   └── synthesizer.py       # Synthesis agent
│   ├── graph/
│   │   ├── state.py             # LangGraph state definition
│   │   └── research_graph.py    # LangGraph workflow
│   ├── api/
│   │   ├── routes.py            # Job queue manager
│   │   └── sse.py               # SSE stream generator
│   ├── db/
│   │   └── models.py            # Database models
│   ├── prompts/
│   │   ├── planner_prompt.txt
│   │   ├── critic_prompt.txt
│   │   └── synthesis_prompt.txt
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentGraph.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ReportViewer.jsx
│   │   │   ├── IntermediateResults.jsx
│   │   │   └── HistorySidebar.jsx
│   │   ├── hooks/
│   │   │   └── useSSE.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── index.html
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Troubleshooting

### Backend Issues

**Issue: "GROQ_API_KEY environment variable is required"**
- Solution: Create `.env` file in backend directory with your Groq API key

**Issue: Database locked errors**
- Solution: Ensure only one backend instance is running, or use PostgreSQL for production

**Issue: Import errors**
- Solution: Make sure you're in the backend directory and virtual environment is activated

### Frontend Issues

**Issue: "Cannot connect to backend"**
- Solution: Ensure backend is running on port 8000, check CORS settings

**Issue: SSE connection fails**
- Solution: Check browser console for errors, ensure job_id is valid

### Docker Issues

**Issue: "Port already in use"**
- Solution: Stop other services using ports 8000 or 5173, or change ports in docker-compose.yml

**Issue: "Cannot find GROQ_API_KEY"**
- Solution: Create `.env` file in root directory with GROQ_API_KEY

## Performance

- **Quick Mode**: ~30-60 seconds per research query
- **Deep Mode**: ~60-120 seconds per research query
- **Concurrent Jobs**: Up to 5 simultaneous research jobs
- **Sources**: 10-20 sources per query (web + papers)

## Limitations

- Web search limited to DuckDuckGo results (no API key required)
- PDF download not implemented (uses abstracts only)
- Maximum 1 retry per research job
- SQLite not recommended for high-concurrency production use
- LLM responses may vary in quality

## Future Enhancements

- User authentication and private sessions
- Export reports to PDF/Markdown
- Custom search source selection
- Advanced visualization of findings
- Multi-language support
- Integration with more academic databases
- Collaborative research features

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Built with LangGraph for agent orchestration
- Powered by Groq's fast LLM inference
- Uses DuckDuckGo for free web search
- ArXiv for academic paper access
