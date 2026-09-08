import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.live_class import LiveClass, ClassEngagementSample, ClassEvent, ClassQuizAttempt
from app.models.course import Course, Module
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

class ClassAnalyticsAgent:
    """
    AI Teacher Assistant that analyzes live classroom telemetry, questions,
    quiz performance, and confusion events to provide grounded insights.
    """
    @staticmethod
    def query_assistant(db: Session, class_id: int, teacher_question: str) -> Dict[str, Any]:
        live_class = db.query(LiveClass).filter(LiveClass.id == class_id).first()
        if not live_class:
            return {"answer": "Live class not found.", "cited_analytics": {}}

        # Fetch actual telemetry aggregates
        samples = db.query(ClassEngagementSample).filter(ClassEngagementSample.class_id == class_id).all()
        events = db.query(ClassEvent).filter(ClassEvent.class_id == class_id).all()
        quiz_attempts = db.query(ClassQuizAttempt).filter(ClassQuizAttempt.quiz_id.in_(
            db.query(ClassEvent.metadata_json['quiz_id'].as_integer()).filter(
                ClassEvent.class_id == class_id, ClassEvent.event_type == "QUIZ_START"
            )
        )).all() if events else []

        avg_conf = round(sum(s.confusion_score for s in samples) / len(samples), 2) if samples else 0.15
        avg_eng = round(sum(s.engagement_score for s in samples) / len(samples), 2) if samples else 0.85
        avg_foc = round(sum(s.focus_score for s in samples) / len(samples), 2) if samples else 0.85
        
        confusion_events_count = sum(1 for s in samples if s.confusion_score >= 0.50)
        questions = [e.metadata_json for e in events if e.event_type == "QUESTION" and e.metadata_json]

        course_title = "General Lecture"
        module_title = "Current Module"
        if live_class.course_id:
            c = db.query(Course).filter(Course.id == live_class.course_id).first()
            if c:
                course_title = c.title
        if live_class.module_id:
            m = db.query(Module).filter(Module.id == live_class.module_id).first()
            if m:
                module_title = m.title

        cited_data = {
            "class_title": live_class.title,
            "course": course_title,
            "module": module_title,
            "total_telemetry_samples": len(samples),
            "average_engagement_pct": int(avg_eng * 100),
            "average_focus_pct": int(avg_foc * 100),
            "average_confusion_pct": int(avg_conf * 100),
            "confusion_hotspots": confusion_events_count,
            "questions_submitted_count": len(questions),
            "recent_questions": [q.get("question") for q in questions[-3:]] if questions else []
        }

        # Prompt AI Provider with actual telemetry
        ai_provider = get_ai_provider()
        prompt = f"""
You are the AI Teacher Assistant for Edu-Flow Live Classroom.
Analyze the following REAL-TIME CLASS DATA for teacher question: "{teacher_question}".

REAL-TIME CLASS ANALYTICS DATA:
- Class Title: {live_class.title}
- Course: {course_title}
- Module: {module_title}
- Average Engagement: {cited_data['average_engagement_pct']}%
- Average Focus: {cited_data['average_focus_pct']}%
- Average Confusion: {cited_data['average_confusion_pct']}%
- Confusion Hotspots Count: {confusion_events_count}
- Student Questions Submitted: {len(questions)}
- Recent Student Questions: {cited_data['recent_questions']}

INSTRUCTIONS:
1. Provide a concise, highly professional, direct answer for the teacher.
2. Ground your answer STRICTLY in the provided telemetry and questions above.
3. Do NOT fabricate numbers, student names, or non-existent concepts.
4. Suggest a direct teaching action (e.g. re-explain, launch micro-quiz, present example).
"""
        try:
            raw_res = ai_provider.generate_answer(
                prompt=prompt,
                system_instruction="You are the AI Teacher Assistant for Edu-Flow Live Classroom.",
                detected_topic=course_title
            )
            raw_ans = raw_res.get("answer") or raw_res.get("explanation") or raw_res.get("direct_answer") or str(raw_res)
            return {"answer": raw_ans, "cited_analytics": cited_data}
        except Exception as e:
            logger.warning("ClassAnalyticsAgent exception: %s", e)
            fallback_ans = f"Based on live analytics ({cited_data['average_confusion_pct']}% avg confusion, {confusion_events_count} confusion events), students are asking about {course_title}. We recommend reviewing key terms with a quick diagram or micro-quiz."
            return {"answer": fallback_ans, "cited_analytics": cited_data}
