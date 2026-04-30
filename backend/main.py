import os
import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from db.models import init_db, get_db, ResearchSession
from graph.research_graph import build_research_graph
from graph.state import ResearchState
from api.routes import JobQueue
from api.sse import SSEStream

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize database
init_db()

# Initialize FastAPI app
app = FastAPI(title="Multi-Agent Research Assistant")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize research graph
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

research_graph = build_research_graph(GROQ_API_KEY)

# Initialize job queue
job_queue = JobQueue(max_concurrent=int(os.getenv("MAX_CONCURRENT_JOBS", "5")))

# Request models
class ResearchRequest(BaseModel):
    question: str
    depth: str = "quick"  # "quick" or "deep"

# Routes
@app.post("/research")
async def create_research_job(request: ResearchRequest, db: Session = Depends(get_db)):
    """Start new research job"""
    try:
        # Validate depth
        if request.depth not in ["quick", "deep"]:
            raise HTTPException(status_code=400, detail="Depth must be 'quick' or 'deep'")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Create initial state
        initial_state: ResearchState = {
            "job_id": job_id,
            "question": request.question,
            "depth": request.depth,
            "plan": None,
            "web_results": [],
            "paper_results": [],
            "document_summaries": [],
            "critic_feedback": None,
            "final_report": None,
            "status": "planning",
            "current_node": "",
            "error_log": [],
            "retry_count": 0,
            "node_executions": []
        }
        
        # Save to database
        session = ResearchSession(
            job_id=job_id,
            question=request.question,
            depth=request.depth,
            status="planning",
            created_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        
        # Submit job to queue
        import asyncio
        asyncio.create_task(job_queue.submit_job(job_id, research_graph, initial_state))
        
        logger.info(f"Created research job {job_id}")
        
        return {
            "job_id": job_id,
            "status": "started",
            "message": "Research job started successfully"
        }
    
    except Exception as e:
        logger.error(f"Failed to create research job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/research/{job_id}/status")
async def get_job_status_stream(job_id: str):
    """Get job status as SSE stream"""
    try:
        sse_stream = SSEStream(job_id, job_queue)
        return StreamingResponse(
            sse_stream.generate_events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.error(f"Failed to stream status for job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/research/{job_id}/report")
async def get_report(job_id: str, db: Session = Depends(get_db)):
    """Retrieve final report"""
    try:
        # Get final state from job queue
        final_state = job_queue.get_final_state(job_id)
        
        if final_state is None:
            # Try to get from database
            session = db.query(ResearchSession).filter(ResearchSession.job_id == job_id).first()
            if session is None:
                raise HTTPException(status_code=404, detail="Job not found")
            
            if session.status != "complete":
                raise HTTPException(status_code=400, detail="Job not complete yet")
            
            return {
                "job_id": job_id,
                "question": session.question,
                "report": session.final_report,
                "status": session.status
            }
        
        # Update database with final report
        if final_state.get("status") == "complete":
            session = db.query(ResearchSession).filter(ResearchSession.job_id == job_id).first()
            if session:
                session.status = "complete"
                session.final_report = final_state.get("final_report")
                session.completed_at = datetime.utcnow()
                db.commit()
        
        return {
            "job_id": job_id,
            "question": final_state["question"],
            "report": final_state.get("final_report"),
            "status": final_state.get("status")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report for job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/research/history")
async def get_history(db: Session = Depends(get_db)):
    """List past research sessions"""
    try:
        sessions = db.query(ResearchSession).order_by(
            ResearchSession.created_at.desc()
        ).limit(50).all()
        
        return {
            "sessions": [
                {
                    "job_id": s.job_id,
                    "question": s.question,
                    "depth": s.depth,
                    "status": s.status,
                    "created_at": s.created_at.isoformat(),
                    "completed_at": s.completed_at.isoformat() if s.completed_at else None
                }
                for s in sessions
            ]
        }
    
    except Exception as e:
        logger.error(f"Failed to get history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
