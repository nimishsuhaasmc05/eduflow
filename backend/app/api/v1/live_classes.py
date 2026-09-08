import json
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.live_class import LiveClass, ClassReport, ClassQuiz, ClassQuizAttempt
from app.schemas.live_class import (
    CreateLiveClassRequest, LiveClassResponse, ValidateJoinRequest,
    JoinClassResponse, ClassTelemetrySample, TeacherLiveAnalyticsResponse,
    ClassAIQueryRequest, ClassAIQueryResponse, LaunchClassQuizRequest,
    SubmitClassQuizRequest, ClassQuizResponse, SubmitQuizResultResponse
)
from app.services.live_class_service import LiveClassService
from app.services.agents.class_analytics_agent import ClassAnalyticsAgent
from app.services.agents.orchestrator import AgentOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-classes", tags=["live-classes"])

# Active WebRTC Signaling & Classroom WebSocket Connections
class ConnectionManager:
    def __init__(self):
        # class_token -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, class_token: str):
        await websocket.accept()
        if class_token not in self.active_connections:
            self.active_connections[class_token] = []
        self.active_connections[class_token].append(websocket)

    def disconnect(self, websocket: WebSocket, class_token: str):
        if class_token in self.active_connections:
            if websocket in self.active_connections[class_token]:
                self.active_connections[class_token].remove(websocket)

    async def broadcast(self, message: dict, class_token: str):
        if class_token in self.active_connections:
            for connection in self.active_connections[class_token]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.warning("WebSocket send error: %s", e)

manager = ConnectionManager()

def build_live_class_response(lc: LiveClass, db: Session) -> LiveClassResponse:
    teacher = db.query(User).filter(User.id == lc.teacher_id).first()
    t_name = teacher.full_name if teacher else "Instructor"
    
    course_title = "General Lecture"
    if lc.course_id:
        from app.models.course import Course
        c = db.query(Course).filter(Course.id == lc.course_id).first()
        if c:
            course_title = c.title

    module_title = "Module Content"
    if lc.module_id:
        from app.models.course import Module
        m = db.query(Module).filter(Module.id == lc.module_id).first()
        if m:
            module_title = m.title

    active_quiz_data = None
    latest_quiz = db.query(ClassQuiz).filter(ClassQuiz.class_id == lc.id).order_by(ClassQuiz.id.desc()).first()
    if latest_quiz:
        active_quiz_data = {
            "quiz_id": latest_quiz.id,
            "topic": latest_quiz.topic,
            "difficulty": latest_quiz.difficulty,
            "questions": latest_quiz.questions_json or []
        }

    return LiveClassResponse(
        id=lc.id,
        class_id=lc.id,
        room_id=lc.join_token,
        join_code=lc.class_code,
        teacher_id=lc.teacher_id,
        teacher_name=t_name,
        course_id=lc.course_id,
        course_title=course_title,
        module_id=lc.module_id,
        module_title=module_title,
        title=lc.title,
        description=lc.description,
        class_code=lc.class_code,
        join_token=lc.join_token,
        join_url=f"/live/{lc.join_token}",
        scheduled_at=lc.scheduled_at,
        started_at=lc.started_at,
        ended_at=lc.ended_at,
        status=lc.status,
        active_participants_count=0,
        active_quiz=active_quiz_data
    )

@router.post("", response_model=LiveClassResponse)
def create_online_class(
    req: CreateLiveClassRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_normalized = (current_user.role or "").strip().lower()
    auth_result = "ALLOWED" if role_normalized in ["teacher", "admin", "instructor", "educator"] else "DENIED"
    logger.info(
        "AUTH DEBUG user_id=%s jwt_sub=%s db_role=%s endpoint=POST /api/v1/live-classes authorization=%s",
        current_user.id, current_user.id, current_user.role, auth_result
    )

    if role_normalized not in ["teacher", "admin", "instructor", "educator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to start an online class."
        )

    live_class = LiveClassService.create_class(db, current_user.id, req)
    return build_live_class_response(live_class, db)

@router.get("", response_model=List[LiveClassResponse])
def list_live_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    classes = db.query(LiveClass).order_by(LiveClass.id.desc()).limit(20).all()
    return [build_live_class_response(c, db) for c in classes]

from app.services.course_security import CourseSecurityService

@router.get("/{class_id}", response_model=LiveClassResponse)
def get_live_class_by_id(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lc = db.query(LiveClass).filter(LiveClass.id == class_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Live class not found.")

    if lc.course_id:
        CourseSecurityService.verify_course_entitlement(db, current_user, lc.course_id)

    return build_live_class_response(lc, db)

@router.get("/join/{code}", response_model=JoinClassResponse)
def get_join_info_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = LiveClassService.validate_join_token_or_code(db, code, user=current_user)
    return JoinClassResponse(**res)

@router.post("/validate-join", response_model=JoinClassResponse)
def validate_join(
    req: ValidateJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = LiveClassService.validate_join_token_or_code(db, req.token_or_code, user=current_user)
    return JoinClassResponse(**res)

@router.post("/{class_id}/join")
def join_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lc = db.query(LiveClass).filter(LiveClass.id == class_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Live class not found.")

    if lc.course_id:
        CourseSecurityService.verify_course_entitlement(db, current_user, lc.course_id)
    
    LiveClassService.join_class_session(db, current_user, class_id)
    return {"message": "Successfully joined class session", "class_id": class_id}

@router.post("/{class_id}/leave")
def leave_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    from app.models.live_class import LiveClassParticipant
    p = db.query(LiveClassParticipant).filter(
        LiveClassParticipant.class_id == class_id,
        LiveClassParticipant.student_id == current_user.id
    ).first()

    if p:
        p.connection_status = "DISCONNECTED"
        p.left_at = datetime.utcnow()
        if p.joined_at:
            p.attendance_duration_seconds = (p.left_at - p.joined_at).total_seconds()
        db.commit()

    return {"message": "Successfully left class session", "class_id": class_id}

@router.get("/{class_id}/participants")
def get_class_participants(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.live_class import LiveClassParticipant
    participants = db.query(LiveClassParticipant).filter(LiveClassParticipant.class_id == class_id).all()
    res = []
    for p in participants:
        st = db.query(User).filter(User.id == p.student_id).first()
        res.append({
            "participant_id": p.id,
            "student_id": p.student_id,
            "name": st.full_name if st else "Student",
            "email": st.email if st else "",
            "joined_at": p.joined_at,
            "connection_status": p.connection_status,
            "attendance_duration_seconds": p.attendance_duration_seconds
        })
    return res

@router.post("/{class_id}/telemetry")
def record_telemetry(
    class_id: int,
    sample: ClassTelemetrySample,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sample.class_id = class_id
    LiveClassService.record_telemetry_sample(db, current_user.id, sample)
    return {"status": "ok"}

@router.get("/{class_id}/analytics", response_model=TeacherLiveAnalyticsResponse)
def get_teacher_analytics(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_normalized = (current_user.role or "").strip().lower()
    if role_normalized not in ["teacher", "admin", "instructor", "educator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics and student telemetry details are restricted to teachers and administrators."
        )

    analytics = LiveClassService.get_teacher_analytics(db, class_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics unavailable.")
    return TeacherLiveAnalyticsResponse(**analytics)

@router.post("/{class_id}/ask-ai", response_model=ClassAIQueryResponse)
def ask_teacher_ai_assistant(
    class_id: int,
    req: ClassAIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = ClassAnalyticsAgent.query_assistant(db, class_id, req.question)
    return ClassAIQueryResponse(answer=res["answer"], cited_analytics=res["cited_analytics"])

@router.post("/{class_id}/quiz/launch", response_model=ClassQuizResponse)
def launch_class_quiz(
    class_id: int,
    req: LaunchClassQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_normalized = (current_user.role or "").strip().lower()
    if role_normalized not in ["teacher", "admin", "instructor", "educator"]:
        raise HTTPException(status_code=403, detail="Only teachers can launch class quizzes.")

    from app.schemas.ai import QuizGenerationRequest
    from app.services.gemini_service import GeminiService

    diff_str = (req.difficulty or "MEDIUM").upper()
    topic_prompt = req.topic
    if req.notes_text and len(req.notes_text.strip()) > 10:
        topic_prompt = f"{req.topic}\n\nLECTURE NOTES / TEXTBOOK EXTRACT:\n{req.notes_text.strip()[:3500]}"

    quiz_gen_req = QuizGenerationRequest(
        topic=topic_prompt,
        target_affect="CONFUSION" if diff_str == "ADAPTIVE" else diff_str,
        num_questions=req.num_questions or 3
    )

    quiz_data = GeminiService.generate_quiz(quiz_gen_req)

    new_quiz = ClassQuiz(
        class_id=class_id,
        topic=req.topic,
        difficulty=req.difficulty or "MEDIUM",
        questions_json=quiz_data.get("questions", [])
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    # Broadcast QUIZ_LAUNCHED to all connected students
    quiz_payload = {
        "type": "QUIZ_LAUNCHED",
        "payload": {
            "quiz_id": new_quiz.id,
            "topic": new_quiz.topic,
            "difficulty": new_quiz.difficulty,
            "questions": new_quiz.questions_json
        }
    }
    lc = db.query(LiveClass).filter(LiveClass.id == class_id).first()
    if lc:
        import asyncio
        async def _do_broadcast():
            await manager.broadcast(quiz_payload, lc.join_token)
            room_id = getattr(lc, 'room_id', None)
            if room_id:
                await manager.broadcast(quiz_payload, room_id)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_broadcast())
        except RuntimeError:
            try:
                asyncio.run(_do_broadcast())
            except Exception as broadcast_err:
                logger.warning("Quiz WebSocket broadcast error: %s", broadcast_err)

    return ClassQuizResponse(
        quiz_id=new_quiz.id,
        topic=new_quiz.topic,
        questions=new_quiz.questions_json
    )

@router.post("/{class_id}/quiz/submit", response_model=SubmitQuizResultResponse)
def submit_class_quiz(
    class_id: int,
    req: SubmitClassQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(ClassQuiz).filter(ClassQuiz.id == req.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    questions = quiz.questions_json or []
    correct = 0
    for idx, q in enumerate(questions):
        correct_idx = q.get("correct_index", 0)
        if idx < len(req.answers) and req.answers[idx] == correct_idx:
            correct += 1

    total = len(questions) if len(questions) > 0 else 1
    pct = round((correct / total) * 100, 1)

    attempt = ClassQuizAttempt(
        quiz_id=quiz.id,
        student_id=current_user.id,
        score_percentage=pct,
        answers_json=req.answers
    )
    db.add(attempt)
    db.commit()

    recovery_status = "OPTIMAL_ENGAGEMENT_RESTORED" if pct >= 50.0 else "ADDITIONAL_EXPLANATION_RECOMMENDED"
    return SubmitQuizResultResponse(score_percentage=pct, affective_recovery_status=recovery_status)

@router.post("/{class_id}/start")
def start_live_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_normalized = (current_user.role or "").strip().lower()
    if role_normalized not in ["teacher", "admin", "instructor", "educator"]:
        raise HTTPException(status_code=403, detail="Only teachers or admins can start class.")

    try:
        live_class = LiveClassService.start_live_class(db, current_user.id, class_id)
        return {"message": "Class started successfully", "status": live_class.status, "class_id": class_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{class_id}/end")
def end_live_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_normalized = (current_user.role or "").strip().lower()
    if role_normalized not in ["teacher", "admin", "instructor", "educator"]:
        raise HTTPException(status_code=403, detail="Only teachers can end class.")

    report = LiveClassService.end_live_class(db, current_user.id, class_id)
    return {"message": "Class ended successfully", "report_id": report.id}

@router.get("/{class_id}/report")
def get_class_report(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(ClassReport).filter(ClassReport.class_id == class_id).first()
    if not report:
        # Generate default report on demand if not ended yet
        lc = db.query(LiveClass).filter(LiveClass.id == class_id).first()
        if not lc:
            raise HTTPException(status_code=404, detail="Report not found.")
        report = LiveClassService.end_live_class(db, lc.teacher_id, class_id)

    return {
        "class_id": report.class_id,
        "summary": report.summary,
        "total_enrolled": report.total_enrolled,
        "attended_count": report.attended_count,
        "average_attendance_pct": report.average_attendance_pct,
        "average_engagement": report.average_engagement,
        "average_focus": report.average_focus,
        "average_confusion": report.average_confusion,
        "average_distraction": report.average_distraction,
        "average_cognitive_load": report.average_cognitive_load,
        "topic_analysis": report.topic_analysis_json,
        "difficult_sections": report.difficult_sections_json,
        "quiz_performance": report.quiz_performance_json,
        "ai_recommendations": report.ai_recommendations_json
    }

@router.get("/{class_id}/student-report/{student_id}")
def get_individual_student_report(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = LiveClassService.get_individual_student_report(db, class_id, student_id)
    if not report:
        raise HTTPException(status_code=404, detail="Student report not found for this class.")
    return report

from fastapi.responses import Response

@router.get("/{class_id}/export-csv")
def export_class_report_csv(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analytics = LiveClassService.get_teacher_analytics(db, class_id)
    lc = db.query(LiveClass).filter(LiveClass.id == class_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Live class not found.")

    csv_lines = [
        "Edu-Flow Live Class Student Interest Telemetry Report",
        f"Class ID,{class_id}",
        f"Class Title,{lc.title}",
        f"Average Class Interest %,{analytics.get('avg_engagement', 82.0)}%",
        f"Average Focus %,{analytics.get('avg_focus', 85.0)}%",
        f"Average Confusion %,{analytics.get('avg_confusion', 12.0)}%",
        "",
        "Student ID,Student Name,Email,Interest Score %,State"
    ]

    for st in analytics.get("student_cards", []):
        csv_lines.append(f"{st.get('student_id')},\"{st.get('name')}\",\"{st.get('email')}\",{st.get('engagement_score')}%,{st.get('state')}")

    csv_content = "\n".join(csv_lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=class_{class_id}_interest_report.csv"}
    )

@router.websocket("/ws/{class_token}")
async def live_class_websocket_signaling(websocket: WebSocket, class_token: str):
    db = SessionLocal()
    try:
        trimmed = class_token.strip()
        lc = db.query(LiveClass).filter(
            (LiveClass.join_token == trimmed) | (LiveClass.class_code == trimmed.upper())
        ).first()

        if not lc or lc.status in ["ENDED", "CANCELLED"]:
            await websocket.close(code=4003, reason="Live class is ended or unavailable.")
            return
    finally:
        db.close()

    await manager.connect(websocket, class_token)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                await manager.broadcast(msg, class_token)
            except Exception as parse_err:
                logger.warning("Invalid WebSocket JSON message: %s", parse_err)
    except WebSocketDisconnect:
        manager.disconnect(websocket, class_token)
        await manager.broadcast({"type": "PARTICIPANT_LEAVE"}, class_token)

@router.websocket("/ws/class/{room_id}")
async def live_class_room_signaling(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                await manager.broadcast(msg, room_id)
            except Exception as parse_err:
                logger.warning("Invalid WebSocket JSON message: %s", parse_err)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast({"type": "PARTICIPANT_LEAVE"}, room_id)
