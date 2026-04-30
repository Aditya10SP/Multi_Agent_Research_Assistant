import asyncio
import json
from typing import AsyncGenerator
from datetime import datetime

class SSEStream:
    """Server-Sent Events stream generator"""
    
    def __init__(self, job_id: str, job_queue):
        self.job_id = job_id
        self.job_queue = job_queue
    
    async def generate_events(self) -> AsyncGenerator[str, None]:
        """Yield SSE-formatted events as job progresses"""
        last_node = None
        last_status_hash = None
        
        while True:
            # Get current job status
            status = await self.job_queue.get_job_status(self.job_id)
            
            if status is None:
                yield self._format_sse_event("error", {"message": "Job not found"})
                break
            
            current_node = status.get("current_node", "")
            job_status = status.get("status", "")
            
            # Create hash of current status to detect changes
            status_hash = hash(json.dumps(status, sort_keys=True, default=str))
            
            # Send update if anything changed
            if status_hash != last_status_hash:
                event_data = {
                    "current_node": current_node,
                    "status": job_status,
                    "plan": status.get("plan"),
                    "web_results": status.get("web_results", []),
                    "paper_results": status.get("paper_results", []),
                    "document_summaries": status.get("document_summaries", []),
                    "critic_feedback": status.get("critic_feedback"),
                    "final_report": status.get("final_report"),
                    "error_log": status.get("error_log", []),
                    "retry_count": status.get("retry_count", 0),
                    "timestamp": datetime.utcnow().isoformat()
                }
                yield self._format_sse_event("update", event_data)
                last_status_hash = status_hash
            
            # Send node change event
            if current_node != last_node and current_node:
                yield self._format_sse_event("node_update", {
                    "node": current_node,
                    "timestamp": datetime.utcnow().isoformat()
                })
                last_node = current_node
            
            # Check if job is complete
            if job_status in ["complete", "failed"]:
                yield self._format_sse_event("complete", {
                    "status": job_status,
                    "timestamp": datetime.utcnow().isoformat()
                })
                break
            
            # Wait before next poll
            await asyncio.sleep(0.5)  # Poll more frequently for better UX
    
    def _format_sse_event(self, event_type: str, data: dict) -> str:
        """Format data as SSE message"""
        return f"data: {json.dumps({'event_type': event_type, **data})}\n\n"
