from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.course import Course, Module, Enrollment
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    ModuleReorderRequest,
    EnrollmentResponse,
    ProgressUpdate
)
from app.core.rbac import allow_teacher, allow_student

router = APIRouter(prefix="/courses", tags=["Courses"])

from app.services.course_security import CourseSecurityService

@router.get("", response_model=List[CourseResponse])
@router.get("/", response_model=List[CourseResponse])
def list_courses(
    teacher_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    if teacher_id is not None:
        query = query.filter(Course.teacher_id == teacher_id)
    if status is not None:
        query = query.filter(Course.status == status)
    courses = query.all()
    result = []
    for c in courses:
        # Public listing contains safe metadata only - modules stripped to prevent data leakage
        c.modules = []
        c.is_enrolled = False
        result.append(c)
    return result

@router.get("/enrollments/my", response_model=List[EnrollmentResponse])
def get_my_enrollments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()

@router.get("/certificates/my")
def get_my_certificates_top(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.course import Certificate
    certs = db.query(Certificate).filter(Certificate.student_id == current_user.id).all()
    results = []
    for cert in certs:
        course = db.query(Course).filter(Course.id == cert.course_id).first()
        results.append({
            "certificate_id": cert.id,
            "certificate_code": cert.certificate_code,
            "course_id": cert.course_id,
            "course_title": course.title if course else "Course Certificate",
            "course_category": course.category if course else "Computer Science",
            "student_name": current_user.full_name,
            "student_email": current_user.email,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else datetime.utcnow().isoformat(),
            "status": "ISSUED"
        })
    return results

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    is_entitled = CourseSecurityService.is_user_entitled_to_course(db, current_user, course.id)
    if is_entitled:
        course.is_enrolled = True
        course.modules = db.query(Module).filter(Module.course_id == course.id).order_by(Module.order).all()
    else:
        course.is_enrolled = False
        # Strip protected modules & lessons for non-entitled users
        course.modules = []

    return course

@router.get("/{course_id}/modules", response_model=List[ModuleResponse])
@router.get("/{course_id}/lessons", response_model=List[ModuleResponse])
def get_course_modules(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    CourseSecurityService.verify_course_entitlement(db, current_user, course_id)
    return db.query(Module).filter(Module.course_id == course_id).order_by(Module.order).all()

from app.services.video_service import auto_fetch_youtube_transcript

@router.post("", response_model=CourseResponse, dependencies=[Depends(allow_teacher)])
@router.post("/", response_model=CourseResponse, dependencies=[Depends(allow_teacher)])
def create_course(
    course_in: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_course = Course(
        title=course_in.title,
        description=course_in.description,
        category=course_in.category,
        difficulty=course_in.difficulty,
        thumbnail_url=course_in.thumbnail_url or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
        status=course_in.status or "published",
        learning_objectives=course_in.learning_objectives,
        duration_hours=course_in.duration_hours or 5.0,
        rating=course_in.rating or 4.8,
        teacher_id=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    if course_in.modules:
        for idx, m in enumerate(course_in.modules, start=1):
            manual_trans = (m.transcript or "").strip()
            v_url = m.video_url or ""
            final_trans = manual_trans if manual_trans else auto_fetch_youtube_transcript(v_url)
            
            mod = Module(
                course_id=new_course.id,
                title=m.title,
                description=m.description,
                order=m.order or idx,
                duration_minutes=m.duration_minutes or 15,
                video_url=v_url or None,
                source_type=getattr(m, 'source_type', None) or ('uploaded_file' if v_url.startswith('/media/') else 'url'),
                transcript=final_trans
            )
            db.add(mod)
        db.commit()

    # Automatically index course & module text for RAG-based AI Tutor
    try:
        from app.services.rag_service import RAGService
        RAGService.index_course_content(db, new_course.id)
    except Exception:
        pass

    new_course.modules = db.query(Module).filter(Module.course_id == new_course.id).order_by(Module.order).all()
    return new_course

@router.put("/{course_id}", response_model=CourseResponse, dependencies=[Depends(allow_teacher)])
def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this course")

    update_data = course_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(course, field, val)

    db.commit()
    db.refresh(course)
    course.modules = db.query(Module).filter(Module.course_id == course.id).order_by(Module.order).all()
    return course

@router.delete("/{course_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(allow_teacher)])
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this course")

    # Safely delete modules and enrollments
    db.query(Module).filter(Module.course_id == course_id).delete()
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
    db.delete(course)
    db.commit()
    return {"detail": f"Course {course_id} deleted successfully"}

# --- Module CRUD Endpoints ---

@router.post("/{course_id}/modules", response_model=ModuleResponse, dependencies=[Depends(allow_teacher)])
def add_module(
    course_id: int,
    module_in: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this course")

    existing_count = db.query(Module).filter(Module.course_id == course_id).count()
    
    manual_trans = (module_in.transcript or "").strip()
    v_url = module_in.video_url or ""
    final_trans = manual_trans if manual_trans else auto_fetch_youtube_transcript(v_url)

    new_module = Module(
        course_id=course_id,
        title=module_in.title,
        description=module_in.description,
        order=module_in.order if module_in.order else existing_count + 1,
        duration_minutes=module_in.duration_minutes or 15,
        video_url=v_url or None,
        source_type=getattr(module_in, 'source_type', None) or ('uploaded_file' if v_url.startswith('/media/') else 'url'),
        transcript=final_trans
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module

@router.put("/{course_id}/modules/{module_id}", response_model=ModuleResponse, dependencies=[Depends(allow_teacher)])
def update_module(
    course_id: int,
    module_id: int,
    module_in: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this course")

    mod = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    update_data = module_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(mod, field, val)

    # Auto-fetch transcript if video_url is provided and transcript is empty
    manual_trans = (mod.transcript or "").strip()
    if not manual_trans and mod.video_url:
        auto_t = auto_fetch_youtube_transcript(mod.video_url)
        if auto_t:
            mod.transcript = auto_t

    db.commit()
    db.refresh(mod)
    return mod

@router.delete("/{course_id}/modules/{module_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(allow_teacher)])
def delete_module(
    course_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this course")

    mod = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    db.delete(mod)
    db.commit()
    return {"detail": f"Module {module_id} deleted successfully"}

@router.post("/{course_id}/modules/reorder", status_code=status.HTTP_200_OK, dependencies=[Depends(allow_teacher)])
def reorder_modules(
    course_id: int,
    req: ModuleReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this course")

    for item in req.modules:
        mod = db.query(Module).filter(Module.id == item.id, Module.course_id == course_id).first()
        if mod:
            mod.order = item.order
    db.commit()
    return {"detail": "Modules reordered successfully"}

# --- Student Enrollment & Progress Endpoints ---

@router.post("/{course_id}/enroll", response_model=EnrollmentResponse)
def enroll_course(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if (current_user.role or "").strip().lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators cannot enroll in courses. Admins manage courses through the Admin Dashboard."
        )

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.course_id == course_id).first()
    if existing:
        return existing
    
    enrollment = Enrollment(
        student_id=current_user.id,
        course_id=course_id,
        progress_percentage=0.0
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    # Log real learning activity event in PostgreSQL
    from app.services.activity_service import ActivityService
    ActivityService.log_event(
        db=db,
        student_id=current_user.id,
        event_type="COURSE_ENROLLED",
        title=f"Enrolled in {course.title}",
        description=f"Enrolled in {course.category} course: {course.title}",
        course_id=course_id,
        xp_earned=50
    )

    return enrollment

@router.post("/{course_id}/progress", response_model=EnrollmentResponse)
def update_course_progress(
    course_id: int,
    payload: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()
    
    was_completed = enrollment.is_completed if enrollment else False
    new_progress = min(100.0, max(0.0, payload.progress_percentage))

    if not enrollment:
        enrollment = Enrollment(
            student_id=current_user.id,
            course_id=course_id,
            progress_percentage=new_progress,
            last_accessed_at=datetime.utcnow(),
            is_completed=new_progress >= 95.0
        )
        db.add(enrollment)
    else:
        enrollment.progress_percentage = max(enrollment.progress_percentage, new_progress)
        enrollment.last_accessed_at = datetime.utcnow()
        if enrollment.progress_percentage >= 95.0:
            enrollment.is_completed = True
            
    db.commit()
    db.refresh(enrollment)

    # Log completion event if newly completed
    if enrollment.is_completed and not was_completed and course:
        from app.services.activity_service import ActivityService
        ActivityService.log_event(
            db=db,
            student_id=current_user.id,
            event_type="COURSE_COMPLETED",
            title=f"Completed {course.title}",
            description=f"Successfully completed 100% of {course.title}",
            course_id=course_id,
            xp_earned=200
        )

    return enrollment

@router.get("/certificates/my")
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.course import Certificate
    certs = db.query(Certificate).filter(Certificate.student_id == current_user.id).all()
    results = []
    for cert in certs:
        course = db.query(Course).filter(Course.id == cert.course_id).first()
        results.append({
            "certificate_id": cert.id,
            "certificate_code": cert.certificate_code,
            "course_id": cert.course_id,
            "course_title": course.title if course else "Course Certificate",
            "course_category": course.category if course else "Computer Science",
            "student_name": current_user.full_name,
            "student_email": current_user.email,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else datetime.utcnow().isoformat(),
            "status": "ISSUED"
        })
    return results

@router.get("/{course_id}/certificate")
@router.post("/{course_id}/claim-certificate")
def claim_or_get_course_certificate(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if (current_user.role or "").strip().lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators manage platform courses and do not claim student certificates."
        )

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete the course content and assessments before claiming your certificate. (No active enrollment found)."
        )

    # Server-Side Completion Verification
    if enrollment.progress_percentage < 100.0 and not enrollment.is_completed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Complete all course lessons and assessments before claiming your certificate. Current progress: {int(enrollment.progress_percentage)}%."
        )

    from uuid import uuid4
    from app.models.course import Certificate

    cert = db.query(Certificate).filter(
        Certificate.student_id == current_user.id,
        Certificate.course_id == course_id
    ).first()

    is_new = False
    if not cert:
        cert_code = f"EDU-CERT-{course_id}-{current_user.id}-{str(uuid4())[:8].upper()}"
        cert = Certificate(
            student_id=current_user.id,
            course_id=course_id,
            certificate_code=cert_code,
            issued_at=datetime.utcnow()
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
        is_new = True

    if is_new:
        from app.services.activity_service import ActivityService
        ActivityService.log_event(
            db=db,
            student_id=current_user.id,
            event_type="CERTIFICATE_CLAIMED",
            title=f"Earned Certificate: {course.title}",
            description=f"Certificate code: {cert.certificate_code}",
            course_id=course_id,
            xp_earned=300
        )

    return {
        "certificate_id": cert.id,
        "certificate_code": cert.certificate_code,
        "student_name": current_user.full_name,
        "student_email": current_user.email,
        "course_title": course.title,
        "course_category": course.category,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else datetime.utcnow().isoformat(),
        "status": "ISSUED"
    }
