# Multi-Agent Research Assistant

<div align="center">

**An intelligent, autonomous research platform powered by multi-agent AI architecture**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-green.svg)](https://github.com/langchain-ai/langgraph)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 🎯 Overview

A production-ready, full-stack research automation platform that leverages six specialized AI agents orchestrated through LangGraph to conduct comprehensive research autonomously. The system intelligently decomposes complex research questions, aggregates information from multiple authoritative sources, performs quality validation, and synthesizes findings into structured, citation-backed reports.

### Key Capabilities

- **🤖 Multi-Agent Orchestration**: Six specialized agents working in coordinated workflow
- **🔍 Intelligent Web Scraping**: Real-time Google search integration with content extraction
- **📚 Academic Integration**: Direct ArXiv paper search and analysis
- **✅ Quality Assurance**: Automated research validation with retry mechanisms
- **📊 Real-Time Visualization**: Live agent execution flow with detailed I/O tracking
- **🎨 Professional UI**: Modern React interface with comprehensive progress monitoring
- **💾 Session Management**: Persistent research history with SQLite backend
- **🌐 RESTful API**: Well-documented FastAPI endpoints with SSE support

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND - React + Vite + TailwindCSS                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • Search Interface          • Real-Time Flow Diagram                           │
│  • Agent Execution Graph     • Detailed I/O Visualization                       │
│  • Progress Monitoring       • Report Viewer                                    │
│  • Research History          • Session Management                               │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │ REST API + Server-Sent Events (SSE)
┌────────────────────────────────▼───────────────────────────────────────────────┐
│                         BACKEND - FastAPI + Python                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  • RESTful API Endpoints     • Job Queue Management (max 5 concurrent)         │
│  • SSE Event Streaming       • SQLite Persistence Layer                        │
│  • State Management          • Error Handling & Logging                        │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼───────────────────────────────────────────────┐
│                    LANGGRAPH AGENT ORCHESTRATION ENGINE                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────┐           │
│  │ Planner  │───▶│ Web Search  │───▶│ Paper Search │───▶│ Reader │           │
│  └──────────┘    └─────────────┘    └──────────────┘    └────┬───┘           │
│       │                                                        │               │
│       │          Strategic Decomposition                      │               │
│       │          Google Scraping + ArXiv                      │               │
│       │                                                        ▼               │
│       │                                                   ┌────────┐           │
│       │                                                   │ Critic │           │
│       │                                                   └───┬────┘           │
│       │                                                       │                │
│       │                                    ┌──────────────────┴────────┐       │
│       │                                    │  Quality < 60%?           │       │
│       │                                    │  Retry Count < 1?         │       │
│       │                                    └──┬─────────────────┬──────┘       │
│       │                                       │                 │              │
│       │                                  YES  │                 │  NO          │
│       │                                       │                 │              │
│       └───────────────────────────────────────┘                 │              │
│                    (Loop Back)                                  │              │
│                                                                 ▼              │
│                                                          ┌─────────────┐       │
│                                                          │ Synthesizer │       │
│                                                          └─────────────┘       │
│                                                                 │              │
│                                                                 ▼              │
│                                                          Final Report          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Workflow

**Sequential Execution Pattern** (prevents state conflicts):

1. **Planner Agent** → Decomposes research question into 3-5 targeted sub-questions
2. **Web Search Agent** → Scrapes Google results + extracts webpage content
3. **Paper Search Agent** → Queries ArXiv for relevant academic publications
4. **Document Reader Agent** → Summarizes sources and extracts key insights
5. **Critic Agent** → Evaluates quality, identifies gaps, decides retry/proceed
6. **Synthesizer Agent** → Generates structured report with citations

**Conditional Routing**: Critic can trigger one retry if quality score < 60%

---

## 🛠️ Tech Stack

### Backend Infrastructure
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Core runtime environment |
| **FastAPI** | 0.115.0 | High-performance REST API framework |
| **LangGraph** | 0.2.55 | Agent workflow orchestration engine |
| **LangChain** | 0.3.13 | LLM integration framework |
| **Groq API** | 0.9.0 | Ultra-fast LLM inference (llama-3.3-70b, llama-3.1-8b) |
| **Tavily API** | 0.5.0 | Reliable web search for AI agents (recommended) |
| **DuckDuckGo Search** | 6.3.5 | Fallback web search (rate limited) |
| **BeautifulSoup4** | 4.12.3 | HTML parsing and web scraping |
| **Requests** | 2.31.0 | HTTP client for web scraping |
| **ArXiv API** | 2.1.3 | Academic paper retrieval |
| **SQLite + SQLAlchemy** | 2.0.36 | Persistent data storage |

### Frontend Stack
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18 | Component-based UI library |
| **Vite** | Latest | Lightning-fast build tool and dev server |
| **TailwindCSS** | Latest | Utility-first CSS framework |
| **Axios** | Latest | Promise-based HTTP client |
| **Lucide React** | Latest | Modern icon library |

### DevOps & Deployment
- **Docker + Docker Compose** - Containerized deployment
- **Uvicorn** - ASGI server for FastAPI
- **CORS Middleware** - Cross-origin resource sharing

---

## 📋 Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 20 or higher  
- **npm**: 9 or higher
- **Docker** (optional): For containerized deployment
- **Groq API Key**: Free tier available at [console.groq.com](https://console.groq.com)
- **Tavily API Key** (Recommended): Free tier (1000 searches/month) at [tavily.com](https://tavily.com) - Required for reliable web search

---

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

**1. Clone Repository**
```bash
git clone <repository-url>
cd MultiAgentResearchAssistant
```

**2. Configure Environment**
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY and TAVILY_API_KEY (recommended)
```

**3. Launch Application**
```bash
docker-compose up --build
```

**4. Access Services**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY and TAVILY_API_KEY (recommended)

# Start server
python main.py
```

Backend available at: **http://localhost:8000**

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at: **http://localhost:5173**

---

## 💡 Usage Guide

### Starting a Research Query

1. **Enter Research Question** in the search bar
2. **Select Research Depth**:
   - **Quick Mode**: 3 sub-questions, ~30-60 seconds
   - **Deep Mode**: 5 sub-questions, ~60-120 seconds
3. **Click "Research"** to initiate workflow
4. **Monitor Progress** via real-time visualizations:
   - Flow diagram shows active agent
   - Detailed I/O logs display data transformations
   - Progress indicators track completion
5. **Review Report** with structured findings and citations

### Example Research Questions

```
✓ "What are the latest developments in quantum computing?"
✓ "How does climate change affect ocean ecosystems?"
✓ "What are the benefits and risks of AI in healthcare?"
✓ "Explain the current state of renewable energy technology"
✓ "What are the main theories about dark matter?"
```

### Understanding Agent Execution

The system provides **complete transparency** into agent operations:

| Agent | Input | Processing | Output |
|-------|-------|------------|--------|
| **Planner** | Research question | LLM decomposition | 3-5 sub-questions + strategy |
| **Web Search** | Sub-questions | Tavily API or DuckDuckGo scraping | 10-15 web results with snippets |
| **Paper Search** | Sub-questions | ArXiv API queries | 10-15 academic papers with abstracts |
| **Document Reader** | All sources | LLM key point extraction | 20 summaries with insights |
| **Critic** | Summaries | Quality scoring + gap analysis | Quality score + retry decision |
| **Synthesizer** | Validated summaries | LLM report generation | Structured report with citations |

### Report Structure

Generated reports include:

- **Executive Summary** (200-500 words)
- **Key Findings** (3-10 discoveries with confidence levels)
- **Supporting Evidence** (Source excerpts with citations)
- **Limitations** (Acknowledged gaps and uncertainties)
- **References** (All cited sources with metadata)
- **Quality Metrics** (Coverage score, source credibility)

---

## 🔌 API Reference

### Core Endpoints

#### `POST /research`
Initiate new research job

**Request Body:**
```json
{
  "question": "Your research question",
  "depth": "quick"  // or "deep"
}
```

**Response:**
```json
{
  "job_id": "uuid-string",
  "status": "started",
  "message": "Research job started successfully"
}
```

#### `GET /research/{job_id}/status`
Server-Sent Events stream for real-time progress

**Response Stream:**
```javascript
data: {"event_type": "update", "current_node": "planner", "status": "planning", ...}
data: {"event_type": "node_update", "node": "web_search", ...}
data: {"event_type": "complete", "status": "complete", ...}
```

#### `GET /research/{job_id}/report`
Retrieve completed research report

**Response:**
```json
{
  "job_id": "uuid-string",
  "question": "Your question",
  "report": {
    "summary": "Executive summary...",
    "key_findings": [...],
    "limitations": [...],
    "references": [...]
  },
  "status": "complete"
}
```

#### `GET /research/history`
List past research sessions (50 most recent)

#### `GET /health`
Health check endpoint

---

## ⚙️ Configuration

### Environment Variables

**Backend Configuration** (`.env`):
```bash
# Required
GROQ_API_KEY=your_groq_api_key_here

# Recommended (for reliable web search)
TAVILY_API_KEY=your_tavily_api_key_here

# Optional (defaults shown)
DATABASE_URL=sqlite:///./data/research.db
CHECKPOINT_DB_URL=sqlite:///./data/checkpoints.db
MAX_CONCURRENT_JOBS=5
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

### Web Search Configuration

The system supports two web search methods:

**Option 1: Tavily API (Recommended)**
- Designed for AI agents with no rate limits
- Free tier: 1000 searches/month
- Sign up at [tavily.com](https://tavily.com)
- Add `TAVILY_API_KEY` to your `.env` file
- Install: `pip install tavily-python`

**Option 2: DuckDuckGo (Fallback)**
- Used automatically when Tavily key not configured
- Subject to aggressive rate limiting
- May return 0 results during rapid searches
- Not recommended for production use

See `WEB_SEARCH_SETUP.md` for detailed configuration instructions.

### LLM Configuration

**Dual-Model Strategy** for optimal performance:

| Model | Use Case | Temperature | Agents |
|-------|----------|-------------|--------|
| **llama-3.3-70b-versatile** | Complex reasoning | 0.3 | Planner, Critic, Synthesizer |
| **llama-3.1-8b-instant** | Fast extraction | 0.1 | Web Search, Paper Search, Reader |

### Customizing Agent Prompts

All prompts are externalized in `backend/prompts/`:

- `planner_prompt.txt` - Research decomposition strategy
- `critic_prompt.txt` - Quality evaluation criteria  
- `synthesis_prompt.txt` - Report generation template

Edit these files to customize agent behavior without code changes.

---

## 📁 Project Structure

```
MultiAgentResearchAssistant/
├── backend/
│   ├── agents/                      # Agent implementations
│   │   ├── planner.py              # Strategic decomposition
│   │   ├── web_search.py           # Tavily API + DuckDuckGo fallback
│   │   ├── paper_search.py         # ArXiv academic search
│   │   ├── document_reader.py      # Content summarization
│   │   ├── critic.py               # Quality evaluation
│   │   └── synthesizer.py          # Report generation
│   ├── graph/
│   │   ├── state.py                # Shared state definition
│   │   └── research_graph.py       # LangGraph workflow orchestration
│   ├── api/
│   │   ├── routes.py               # REST endpoints + job queue
│   │   └── sse.py                  # Server-Sent Events streaming
│   ├── db/
│   │   └── models.py               # SQLAlchemy database models
│   ├── prompts/                    # External prompt templates
│   │   ├── planner_prompt.txt
│   │   ├── critic_prompt.txt
│   │   └── synthesis_prompt.txt
│   ├── data/                       # SQLite databases
│   ├── main.py                     # FastAPI application entry
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Backend container config
│   └── .env.example               # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.jsx              # Query input interface
│   │   │   ├── FlowDiagram.jsx            # Visual agent workflow
│   │   │   ├── GraphFlowVisualization.jsx # Detailed I/O logs
│   │   │   ├── ComprehensiveProgress.jsx  # Progress tracking
│   │   │   ├── ReportViewer.jsx           # Report display
│   │   │   └── HistorySidebar.jsx         # Session history
│   │   ├── hooks/
│   │   │   └── useSSE.js                  # SSE connection hook
│   │   ├── utils/
│   │   │   └── agentStepDefinitions.js    # Agent metadata
│   │   ├── App.jsx                        # Main application
│   │   ├── main.jsx                       # React entry point
│   │   └── index.css                      # Global styles
│   ├── package.json                # Node dependencies
│   ├── vite.config.js             # Vite configuration
│   ├── tailwind.config.js         # TailwindCSS config
│   ├── Dockerfile                 # Frontend container config
│   └── index.html                 # HTML template
├── docker-compose.yml             # Multi-container orchestration
├── .env.example                   # Root environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

---

## 🐛 Troubleshooting

### Backend Issues

**Issue**: `GROQ_API_KEY environment variable is required`  
**Solution**: Create `.env` file in backend directory with valid Groq API key

**Issue**: Web search returning 0 results  
**Solution**: 
1. **Recommended**: Get free Tavily API key from [tavily.com](https://tavily.com)
2. Add `TAVILY_API_KEY=your_key` to `.env` file
3. Install: `pip install tavily-python`
4. Restart backend server
5. See `WEB_SEARCH_SETUP.md` for detailed instructions

**Issue**: DuckDuckGo rate limiting (202 Ratelimit errors)  
**Solution**: This is expected with DuckDuckGo fallback. Use Tavily API for reliable searches (see above)

**Issue**: Database locked errors  
**Solution**: Ensure only one backend instance is running. For production, use PostgreSQL

**Issue**: Import errors  
**Solution**: Verify virtual environment is activated and dependencies are installed

### Frontend Issues

**Issue**: Cannot connect to backend  
**Solution**: Verify backend is running on port 8000, check CORS settings in backend `.env`

**Issue**: SSE connection fails  
**Solution**: Check browser console for errors, ensure job_id is valid, verify backend is accessible

**Issue**: Blank visualizations  
**Solution**: Ensure backend is sending `node_executions` data in SSE stream

### Docker Issues

**Issue**: Port already in use  
**Solution**: Stop services using ports 8000/5173, or modify ports in `docker-compose.yml`

**Issue**: Cannot find GROQ_API_KEY  
**Solution**: Create `.env` file in root directory with `GROQ_API_KEY=your_key`

**Issue**: Container build fails  
**Solution**: Ensure Docker has sufficient memory (4GB+), check Docker logs for specific errors

---

## 📊 Performance Metrics

| Metric | Quick Mode | Deep Mode |
|--------|-----------|-----------|
| **Execution Time** | 30-60 seconds | 60-120 seconds |
| **Sub-Questions** | 3 | 5 |
| **Web Results** | 9-15 | 15-25 |
| **Academic Papers** | 9-15 | 15-25 |
| **Total Sources** | 18-30 | 30-50 |
| **Concurrent Jobs** | Up to 5 simultaneous |
| **Retry Attempts** | Maximum 1 per job |

---

## ⚠️ Limitations

- **Web Search**: DuckDuckGo fallback has aggressive rate limiting; Tavily API recommended for production
- **PDF Processing**: Currently uses abstracts only; full PDF extraction not implemented
- **Retry Logic**: Maximum 1 retry per research job to prevent infinite loops
- **Database**: SQLite not recommended for high-concurrency production environments
- **LLM Variability**: Response quality depends on Groq API availability and model performance
- **Language Support**: Currently optimized for English-language research

---

## 🚀 Future Enhancements

- [ ] User authentication and private research sessions
- [ ] Export reports to PDF/Markdown/LaTeX formats
- [ ] Custom search source selection (Bing, Brave, etc.)
- [ ] Advanced visualization of research findings
- [ ] Multi-language support (Spanish, French, German, etc.)
- [ ] Integration with additional academic databases (PubMed, IEEE, etc.)
- [ ] Collaborative research features (shared sessions, comments)
- [ ] Full PDF content extraction and analysis
- [ ] Custom agent configuration via UI
- [ ] Research template library

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure:
- Code follows existing style conventions
- All tests pass
- Documentation is updated
- Commit messages are descriptive

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Open an issue](https://github.com/yourusername/MultiAgentResearchAssistant/issues)
- **Discussions**: [Join the discussion](https://github.com/yourusername/MultiAgentResearchAssistant/discussions)
- **Email**: your.email@example.com

---

## 🙏 Acknowledgments

- **LangGraph** - Agent orchestration framework
- **Groq** - Ultra-fast LLM inference platform
- **ArXiv** - Open access to academic papers
- **FastAPI** - Modern Python web framework
- **React** - Component-based UI library
- **TailwindCSS** - Utility-first CSS framework

---

## 📚 Learn More

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [Groq API Documentation](https://console.groq.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

---

<div align="center">

**Built with ❤️ using Multi-Agent AI Architecture**

⭐ Star this repo if you find it useful!

</div>
