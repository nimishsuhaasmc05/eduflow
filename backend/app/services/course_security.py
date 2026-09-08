import logging
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.course import Course, Enrollment

logger = logging.getLogger(__name__)

class CourseSecurityService:
    """
    SERVER-SIDE COURSE ENTITLEMENT & AUTHORIZATION SERVICE
    Enforces that premium course contents (modules, lessons, videos, transcripts, quizzes,
    live class streams) are accessible ONLY to entitled users (Admins, Teachers, or Enrolled Students).
    """

    @staticmethod
    def is_user_entitled_to_course(db: Session, user: Optional[User], course_id: int) -> bool:
        if not user:
            return False

        # 1. Admins and Teachers/Educators have full access to inspect/teach courses
        role_normalized = (user.role or "").strip().lower()
        if role_normalized in ["admin", "teacher", "instructor", "educator"]:
            return True

        # 2. Retrieve Course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return False

        # 3. If Course is FREE (is_premium == False), any authenticated student has access
        if not getattr(course, "is_premium", False):
            return True

        # 4. If Course is PREMIUM (is_premium == True), verify active Enrollment record
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course_id
        ).first()

        return enrollment is not None

    @staticmethod
    def verify_course_entitlement(db: Session, user: Optional[User], course_id: int):
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to access this resource."
            )

        if not CourseSecurityService.is_user_entitled_to_course(db, user, course_id):
            logger.warning(
                "SECURITY ALERT: Unauthorized course access attempt by user_id=%s role=%s course_id=%s",
                user.id, user.role, course_id
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this course."
            )
