import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.course import ActivityEvent

logger = logging.getLogger(__name__)

class ActivityService:
    @staticmethod
    def log_event(
        db: Session,
        student_id: int,
        event_type: str,
        title: str,
        description: Optional[str] = None,
        course_id: Optional[int] = None,
        module_id: Optional[int] = None,
        xp_earned: int = 0
    ) -> Optional[ActivityEvent]:
        """
        Records a genuine learning event for the student in PostgreSQL.
        """
        try:
            event = ActivityEvent(
                student_id=student_id,
                course_id=course_id,
                module_id=module_id,
                event_type=event_type,
                title=title,
                description=description,
                xp_earned=xp_earned,
                created_at=datetime.utcnow()
            )
            db.add(event)
            db.commit()
            db.refresh(event)
            return event
        except Exception as e:
            logger.warning(f"Failed to log activity event: {e}")
            db.rollback()
            return None

    @staticmethod
    def get_user_activities(
        db: Session,
        student_id: int,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Retrieves authentic chronological learning activity events for the student.
        """
        try:
            events = db.query(ActivityEvent).filter(
                ActivityEvent.student_id == student_id
            ).order_by(ActivityEvent.created_at.desc()).limit(limit).all()

            results = []
            for ev in events:
                results.append({
                    "id": ev.id,
                    "student_id": ev.student_id,
                    "course_id": ev.course_id,
                    "module_id": ev.module_id,
                    "event_type": ev.event_type,
                    "title": ev.title,
                    "description": ev.description,
                    "xp_earned": ev.xp_earned,
                    "created_at": ev.created_at.isoformat() if ev.created_at else datetime.utcnow().isoformat()
                })
            return results
        except Exception as e:
            logger.error(f"Error fetching user activities: {e}")
            return []
