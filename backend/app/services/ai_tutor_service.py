from typing import Optional
from sqlalchemy.orm import Session
from app.schemas.ai import AITutorQuery, AITutorResponse
from app.services.agents.orchestrator import AgentOrchestrator

class AITutorService:
    @staticmethod
    def generate_response(query: AITutorQuery, db: Optional[Session] = None) -> AITutorResponse:
        return AgentOrchestrator.process_tutor_query(query, db=db)
