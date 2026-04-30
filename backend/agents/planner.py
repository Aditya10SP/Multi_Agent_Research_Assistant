import json
import logging
from typing import Dict
from langchain_groq import ChatGroq
from graph.state import ResearchState

logger = logging.getLogger(__name__)

class PlannerAgent:
    """Breaks down research question into actionable sub-tasks"""
    
    def __init__(self, llm: ChatGroq):
        self.llm = llm
        self.name = "planner"
    
    def execute(self, state: ResearchState) -> ResearchState:
        """Generate research plan with 3-5 sub-questions"""
        from datetime import datetime
        
        # Log input state
        input_snapshot = {
            "question": state["question"],
            "depth": state["depth"],
            "retry_count": state["retry_count"]
        }
        
        state["current_node"] = self.name
        state["status"] = "planning"
        
        execution_log = {
            "node": self.name,
            "started_at": datetime.utcnow().isoformat(),
            "input": input_snapshot,
            "output": None,
            "error": None,
            "completed_at": None
        }
        
        try:
            logger.info(f"Planner starting for job {state['job_id']}")
            
            # Load prompt template
            with open("prompts/planner_prompt.txt", "r") as f:
                prompt_template = f.read()
            
            # Determine number of questions based on depth
            num_questions = 5 if state["depth"] == "deep" else 3
            
            # Format prompt
            prompt = prompt_template.format(
                question=state["question"],
                depth=state["depth"],
                num_questions=num_questions
            )
            
            execution_log["prompt_sent"] = prompt[:500] + "..." if len(prompt) > 500 else prompt
            
            # Call LLM
            response = self.llm.invoke(prompt)
            
            # Extract JSON from response (handle cases where LLM adds extra text)
            content = response.content.strip()
            execution_log["raw_llm_response"] = content[:1000] + "..." if len(content) > 1000 else content
            
            # Try to find JSON in the response
            if content.startswith("```json"):
                content = content.split("```json")[1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[1].split("```")[0].strip()
            
            # Parse JSON response
            plan = json.loads(content)
            
            state["plan"] = plan
            
            # Log output
            execution_log["output"] = {
                "plan": plan,
                "num_sub_questions": len(plan.get("sub_questions", [])),
                "strategy": plan.get("strategy", "")
            }
            execution_log["completed_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Plan generated with {len(plan['sub_questions'])} sub-questions")
            
        except Exception as e:
            logger.error(f"Planner failed: {str(e)}")
            state["error_log"].append(f"Planner: {str(e)}")
            execution_log["error"] = str(e)
            execution_log["completed_at"] = datetime.utcnow().isoformat()
        
        # Add execution log to state
        state["node_executions"].append(execution_log)
        
        return state
