from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.ai import AITutorQuery, AITutorResponse, LibraryActionRequest, LibraryActionResponse, GeminiTopicRequest, GeminiTopicResponse
from app.services.ai_tutor_service import AITutorService
from app.services.gemini_service import GeminiService
from app.api.deps import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/ai-tutor", tags=["AI Tutor & RAG"])

@router.post("/query", response_model=AITutorResponse)
def ask_ai_tutor(
    query: AITutorQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resp = AITutorService.generate_response(query, db=db)
    
    # Log real learning activity event in PostgreSQL
    from app.services.activity_service import ActivityService
    user_q = (query.question or query.query or "Concept Inquiry").strip()
    topic = query.module_title or query.video_topic or "Course Topic"
    ActivityService.log_event(
        db=db,
        student_id=current_user.id,
        event_type="AI_TUTOR_USED",
        title=f"Consulted AI Socratic Tutor on {topic}",
        description=f"Inquiry: '{user_q[:80]}...'",
        course_id=query.course_id,
        module_id=query.module_id,
        xp_earned=15
    )
    return resp

@router.post("/library/action", response_model=LibraryActionResponse)
def execute_library_action(req: LibraryActionRequest, current_user: User = Depends(get_current_user)):
    return GeminiService.generate_library_assistant_response(req)

@router.post("/library/ask", response_model=LibraryActionResponse)
def ask_library_assistant(req: LibraryActionRequest, current_user: User = Depends(get_current_user)):
    return GeminiService.generate_library_assistant_response(req)

@router.post("/library/ask-gemini", response_model=GeminiTopicResponse)
def ask_gemini_topic(req: GeminiTopicRequest, current_user: User = Depends(get_current_user)):
    return GeminiService.generate_topic_breakdown(req)
