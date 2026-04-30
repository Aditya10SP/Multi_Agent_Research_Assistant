import asyncio
import uuid
from typing import Dict, Optional
from datetime import datetime
from graph.state import ResearchState

class JobQueue:
    """Manages concurrent research job execution"""
    
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.active_jobs: Dict[str, Dict] = {}
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.job_states: Dict[str, ResearchState] = {}
    
    async def submit_job(self, job_id: str, graph, initial_state: ResearchState):
        """Submit new job to queue"""
        async with self.semaphore:
            self.active_jobs[job_id] = {
                "status": "running",
                "started_at": datetime.utcnow().isoformat()
            }
            self.job_states[job_id] = initial_state
            
            try:
                # Execute graph
                config = {"configurable": {"thread_id": job_id}}
                
                # Run in thread pool to avoid blocking
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Starting graph execution for job {job_id}")
                
                final_state = await asyncio.to_thread(graph.invoke, initial_state, config)
                
                logger.info(f"Graph execution completed for job {job_id}")
                self.job_states[job_id] = final_state
                self.active_jobs[job_id]["status"] = "complete"
                
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Job {job_id} failed with error: {str(e)}", exc_info=True)
                
                self.job_states[job_id]["status"] = "failed"
                self.job_states[job_id]["error_log"].append(str(e))
                self.active_jobs[job_id]["status"] = "failed"
    
    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get current status of job"""
        if job_id not in self.job_states:
            return None
        
        state = self.job_states[job_id]
        # Return full state for detailed progress tracking
        return dict(state)
    
    def get_final_state(self, job_id: str) -> Optional[ResearchState]:
        """Get final state of completed job"""
        return self.job_states.get(job_id)
    
    def is_job_complete(self, job_id: str) -> bool:
        """Check if job has finished"""
        if job_id not in self.active_jobs:
            return False
        return self.active_jobs[job_id]["status"] in ["complete", "failed"]
