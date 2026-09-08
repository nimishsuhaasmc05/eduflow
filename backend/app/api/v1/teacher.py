from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import allow_teacher
from app.schemas.analytics import TeacherCourseAnalytics
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/teacher", tags=["Teacher Analytics & Reports"], dependencies=[Depends(allow_teacher)])

from typing import List, Dict, Any

@router.get("/courses/{course_id}/analytics", response_model=TeacherCourseAnalytics)
def get_teacher_course_analytics(course_id: int, db: Session = Depends(get_db)):
    return AnalyticsService.get_course_affective_analytics(db, course_id)

@router.get("/courses/{course_id}/students", response_model=List[Dict[str, Any]])
def get_course_student_roster(course_id: int, db: Session = Depends(get_db)):
    return AnalyticsService.get_course_student_roster(db, course_id)

@router.get("/students", response_model=List[Dict[str, Any]])
def get_all_teacher_students(db: Session = Depends(get_db)):
    return AnalyticsService.get_course_student_roster(db, 1)
