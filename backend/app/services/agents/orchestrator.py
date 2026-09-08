import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.schemas.ai import AITutorQuery, AITutorResponse
from app.services.agents.content_agent import ContentAgent
from app.services.agents.affective_agent import AffectiveAgent
from app.services.agents.pedagogical_agent import PedagogicalAgent
from app.services.agents.tutor_agent import TutorAgent
from app.services.agents.quiz_agent import QuizAgent
from app.services.agents.intervention_agent import InterventionAgent

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """
    AGENT ORCHESTRATOR: Coordinates Content, Affective, Pedagogical, Tutor, Quiz, and Intervention Agents.
    Executes reasoning engine flow without mixing content knowledge (WHAT) with affective delivery (HOW).
    """
    @staticmethod
    def process_tutor_query(
        query: AITutorQuery,
        db: Optional[Session] = None
    ) -> AITutorResponse:
        # Step 1: ContentAgent retrieves grounded video/course knowledge (WHAT to teach) via RAG
        user_q = (query.question or query.query or "").strip()
        knowledge_context = ContentAgent.get_grounded_content(
            db=db,
            course_id=query.course_id,
            module_id=query.module_id,
            video_url=query.video_url,
            title=query.video_title or query.module_title,
            description=query.module_description,
            query_text=user_q
        )

        # Step 2: AffectiveAgent classifies numerical learner state (HOW to deliver)
        learner_state = AffectiveAgent.classify_state(
            primary_state=query.student_affective_state or query.affective_state or "FOCUSED"
        )

        # Step 3: PedagogicalAgent selects presentation strategy
        is_socratic = (query.mode or "").lower() == "socratic"
        strategy = PedagogicalAgent.select_strategy(
            affective_state=learner_state,
            is_socratic_mode=is_socratic
        )

        # Step 4: TutorAgent formulates grounded response
        return TutorAgent.generate_response(
            query=query,
            knowledge_context=knowledge_context,
            pedagogical_strategy=strategy
        )

    @staticmethod
    def generate_adaptive_quiz(
        topic: str,
        affective_state: str = "CONFUSION",
        num_questions: int = 3
    ) -> Dict[str, Any]:
        return QuizAgent.generate_adaptive_quiz(
            topic=topic,
            target_affect=affective_state,
            num_questions=num_questions
        )

    @staticmethod
    def evaluate_intervention(
        affective_state: str,
        quiz_score_percentage: Optional[float] = None
    ) -> Dict[str, Any]:
        if quiz_score_percentage is not None:
            recovery_status = InterventionAgent.evaluate_recovery(quiz_score_percentage)
            return {
                "affective_recovery_status": recovery_status,
                "score_percentage": quiz_score_percentage
            }

        return InterventionAgent.select_intervention(affective_state)
