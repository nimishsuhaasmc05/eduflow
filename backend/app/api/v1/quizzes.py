from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.ai import QuizGenerationRequest, QuizSubmission, AttentionActivityRequest, AttentionActivitySubmission
from app.services.quiz_generator import DynamicQuizGenerator
from app.services.agents.quiz_agent import compute_question_hash
from app.api.deps import get_current_user
from app.models.user import User
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt

router = APIRouter(prefix="/quizzes", tags=["Adaptive Quizzes"])

@router.post("/generate", response_model=Dict[str, Any])
def generate_adaptive_quiz(
    req: QuizGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz_data = DynamicQuizGenerator.generate_adaptive_quiz(req, db)
    
    # Save quiz header and questions into PostgreSQL quizzes & quiz_questions tables
    try:
        new_quiz = Quiz(
            course_id=req.course_id or 1,
            module_id=req.module_id,
            title=quiz_data.get("title", f"Adaptive Quiz: {req.topic}"),
            target_affect_state=req.target_affect or "CONFUSION"
        )
        db.add(new_quiz)
        db.commit()
        db.refresh(new_quiz)
        quiz_id = new_quiz.id
        quiz_data["quiz_id"] = quiz_id

        # Persist each generated question with correct_option_index
        questions_list = quiz_data.get("questions", [])
        normalized_questions = []
        for i, q in enumerate(questions_list):
            if isinstance(q, dict):
                q_text = str(q.get("question") or q.get("text") or f"Question {i+1}")
                opts = q.get("options") or ["Option A", "Option B", "Option C", "Option D"]
                c_idx = int(q.get("correct_index", q.get("correct", 0)))
                expl = str(q.get("explanation", "Correct answer based on course material."))
                q_topic = str(q.get("topic") or req.topic or "Fundamentals")
                q_hash = str(q.get("question_hash") or q.get("id") or compute_question_hash(q_topic, q_text, opts))

                qq = QuizQuestion(
                    quiz_id=quiz_id,
                    question_text=q_text,
                    options=opts,
                    correct_option_index=c_idx,
                    explanation=expl,
                    difficulty_level="Medium"
                )
                db.add(qq)
                normalized_questions.append({
                    "id": q_hash,
                    "raw_id": i + 1,
                    "question_hash": q_hash,
                    "question_id": q_hash,
                    "question": q_text,
                    "text": q_text,
                    "options": opts,
                    "correct_index": c_idx,
                    "correct": c_idx,
                    "explanation": expl,
                    "topic": q_topic,
                    "hint": q.get("hint"),
                    "image_required": bool(q.get("image_required", False)),
                    "image_optional": bool(q.get("image_optional", False)),
                    "image_reference": q.get("image_reference"),
                    "timestamp_reference": q.get("timestamp_reference"),
                    "timestamp_seconds": q.get("timestamp_seconds")
                })
        db.commit()
        if normalized_questions:
            quiz_data["questions"] = normalized_questions

    except Exception as err:
        db.rollback()
        quiz_data["quiz_id"] = 1

    return quiz_data

@router.post("/submit", response_model=Dict[str, Any])
def submit_quiz(
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch real QuizQuestion rows for the submitted quiz_id from database
    quiz_questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == submission.quiz_id).order_by(QuizQuestion.id).all()
    
    submitted_answers = submission.answers or []
    
    if quiz_questions:
        total = len(quiz_questions)
        correct_count = 0
        for i, q in enumerate(quiz_questions):
            if i < len(submitted_answers) and submitted_answers[i] == q.correct_option_index:
                correct_count += 1
    else:
        # Fallback if submission.quiz_id has no DB question entries
        total = max(1, len(submitted_answers))
        correct_count = sum(1 for ans in submitted_answers if ans == 0)

    score_percentage = round((correct_count / total) * 100.0, 1)
    xp_earned = int((score_percentage / 100.0) * 50)
    
    # Store attempt in PostgreSQL
    attempt = QuizAttempt(
        student_id=current_user.id,
        quiz_id=submission.quiz_id,
        score_percentage=score_percentage,
        total_questions=total,
        correct_answers=correct_count,
        affective_state_before="CONFUSION",
        affective_state_after="OPTIMAL_ENGAGEMENT" if score_percentage >= 50 else "REVIEW_NEEDED"
    )
    db.add(attempt)
    
    # Update student XP in PostgreSQL
    current_user.total_xp = (current_user.total_xp or 0) + xp_earned
    db.commit()

    # Log real learning activity event in PostgreSQL
    from app.services.activity_service import ActivityService
    quiz_obj = db.query(Quiz).filter(Quiz.id == submission.quiz_id).first()
    quiz_title = quiz_obj.title if quiz_obj else "Adaptive Knowledge Check"
    ActivityService.log_event(
        db=db,
        student_id=current_user.id,
        event_type="QUIZ_PASSED" if score_percentage >= 70 else "QUIZ_COMPLETED",
        title=f"{'Passed' if score_percentage >= 70 else 'Completed'} {quiz_title}",
        description=f"Scored {score_percentage}% ({correct_count}/{total} correct). +{xp_earned} XP",
        course_id=quiz_obj.course_id if quiz_obj else None,
        module_id=quiz_obj.module_id if quiz_obj else None,
        xp_earned=xp_earned
    )
    
    return {
        "quiz_id": submission.quiz_id,
        "score_percentage": score_percentage,
        "correct_answers": correct_count,
        "total_questions": total,
        "xp_earned": xp_earned,
        "affective_recovery_status": "OPTIMAL_ENGAGEMENT_RESTORED" if score_percentage >= 50 else "ADDITIONAL_REVIEW_SUGGESTED",
        "feedback": f"Quiz submission evaluated: {correct_count}/{total} correct ({score_percentage}%). +{xp_earned} XP added!"
    }


@router.post("/attention-activity/generate", response_model=Dict[str, Any])
def generate_attention_activity(
    req: AttentionActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.agents.attention_activity_agent import AttentionActivityAgent
    from app.services.video_knowledge_service import VideoKnowledgeService

    # Fetch context from video knowledge if available
    video_knowledge = None
    if req.module_id:
        from app.models.course import VideoKnowledge
        vk = db.query(VideoKnowledge).filter(VideoKnowledge.module_id == req.module_id).first()
        if vk:
            video_knowledge = {
                "summary": vk.summary,
                "concepts": vk.concepts or [],
                "definitions": vk.definitions or {},
                "important_points": vk.important_points or []
            }

    activity = AttentionActivityAgent.generate_activity(
        topic=req.topic,
        preferred_type=req.preferred_type,
        course_id=req.course_id,
        module_id=req.module_id,
        context=req.transcript,
        video_knowledge=video_knowledge,
        session_index=req.session_index or 0
    )
    return activity


@router.post("/attention-activity/submit", response_model=Dict[str, Any])
def submit_attention_activity(
    submission: AttentionActivitySubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.activity_service import ActivityService
    from app.services.intervention_engine import InterventionEngine

    xp_earned = 30 if submission.completed else 10
    current_user.total_xp = (current_user.total_xp or 0) + xp_earned
    db.commit()

    # Reset escalation counters upon attention activity completion
    InterventionEngine.reset_ineffective_counter(current_user.id)

    # Log in activity event history
    ActivityService.log_event(
        db=db,
        student_id=current_user.id,
        event_type="ATTENTION_ACTIVITY_COMPLETED",
        title=f"Completed {submission.activity_type.replace('_', ' ').title()}",
        description=f"Quick interactive focus challenge completed in {int(submission.time_spent_seconds)}s. +{xp_earned} XP",
        course_id=submission.course_id,
        module_id=submission.module_id,
        xp_earned=xp_earned
    )

    return {
        "activity_id": submission.activity_id,
        "completed": submission.completed,
        "xp_earned": xp_earned,
        "message": f"Great focus! You completed the attention challenge in {int(submission.time_spent_seconds)}s. +{xp_earned} XP added!",
        "reset_escalation": True
    }

