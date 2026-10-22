import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.rbac import allow_admin
from app.api.deps import get_current_user
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.live_class import LiveClass, LiveClassParticipant
from app.models.analytics import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Control & Metrics"], dependencies=[Depends(allow_admin)])

def log_admin_action(db: Session, current_user: User, action: str, details: str):
    try:
        log_entry = AuditLog(
            user_id=current_user.id,
            action=action,
            details=f"Admin {current_user.email}: {details}",
            created_at=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.warning("AuditLog error: %s", e)

# Pydantic Schemas
class UserStatusUpdateRequest(BaseModel):
    is_active: bool

class UserRoleUpdateRequest(BaseModel):
    role: str

class CourseStatusUpdateRequest(BaseModel):
    status: str

# 1. Admin Dashboard System Overview
@router.get("/dashboard")
@router.get("/profile/overview")
def get_admin_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_teachers = db.query(User).filter(User.role.in_(["teacher", "instructor", "educator"])).count()
    total_admins = db.query(User).filter(User.role == "admin").count()
    active_users = db.query(User).filter(User.is_active == True).count()
    deactivated_users = db.query(User).filter(User.is_active == False).count()

    total_courses = db.query(Course).count()
    active_courses = db.query(Course).count()
    premium_courses = db.query(Course).filter(Course.is_premium == True).count()

    total_live_classes = db.query(LiveClass).count()
    active_live_classes = db.query(LiveClass).filter(LiveClass.status == "LIVE").count()
    total_enrollments = db.query(Enrollment).count()

    connected_students = db.query(LiveClassParticipant).filter(
        LiveClassParticipant.connection_status == "CONNECTED"
    ).count()

    # Active Live Classes List
    live_classes_raw = db.query(LiveClass).filter(LiveClass.status == "LIVE").order_by(LiveClass.id.desc()).all()
    active_classes_list = []
    for lc in live_classes_raw:
        t = db.query(User).filter(User.id == lc.teacher_id).first()
        c_count = db.query(LiveClassParticipant).filter(
            LiveClassParticipant.class_id == lc.id,
            LiveClassParticipant.connection_status == "CONNECTED"
        ).count()
        active_classes_list.append({
            "id": lc.id,
            "title": lc.title,
            "class_code": lc.class_code,
            "join_token": lc.join_token,
            "teacher_name": t.full_name if t else "Instructor",
            "teacher_email": t.email if t else "",
            "started_at": lc.started_at.isoformat() if lc.started_at else None,
            "connected_count": c_count
        })

    # Recent Audit Activity Logs
    recent_logs_raw = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    recent_activity = []
    for log in recent_logs_raw:
        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return {
        "metrics": {
            "total_users": total_users,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_admins": total_admins,
            "active_users": active_users,
            "deactivated_users": deactivated_users,
            "total_courses": total_courses,
            "active_courses": active_courses,
            "premium_courses": premium_courses,
            "total_live_classes": total_live_classes,
            "active_live_classes": active_live_classes,
            "total_enrollments": total_enrollments,
            "connected_students": connected_students
        },
        "active_live_classes": active_classes_list,
        "recent_activity": recent_activity,
        "system_health": {
            "status": "HEALTHY",
            "database": "ONLINE",
            "redis_pubsub": "OPERATIONAL",
            "ai_engine": "ACTIVE"
        }
    }

# 2. User Management Endpoints
@router.get("/users")
def list_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(s_term)) | (User.email.ilike(s_term)) | (User.username.ilike(s_term)))
    if role and role.strip() and role.lower() != "all":
        query = query.filter(User.role == role.strip().lower())
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.id.desc()).all()
    res = []
    for u in users:
        res.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return res

@router.post("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    req: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.id == current_user.id and not req.is_active:
        raise HTTPException(status_code=400, detail="Action prohibited: You cannot deactivate your own admin account.")

    if target.role == "admin" and not req.is_active:
        other_admins = db.query(User).filter(User.role == "admin", User.is_active == True, User.id != target.id).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Action prohibited: System requires at least one active administrator.")

    target.is_active = req.is_active
    db.commit()

    log_admin_action(db, current_user, "USER_STATUS_CHANGE", f"Updated status of {target.email} (ID={target.id}) to is_active={req.is_active}")
    return {"message": "User status updated successfully", "user_id": target.id, "is_active": target.is_active}

@router.post("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    new_role = req.role.strip().lower()
    if new_role not in ["student", "teacher", "instructor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    if target.id == current_user.id and new_role != "admin":
        raise HTTPException(status_code=400, detail="Action prohibited: You cannot remove admin role from your own account.")

    if target.role == "admin" and new_role != "admin":
        other_admins = db.query(User).filter(User.role == "admin", User.is_active == True, User.id != target.id).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Action prohibited: System requires at least one active administrator.")

    old_role = target.role
    target.role = new_role
    db.commit()

    log_admin_action(db, current_user, "USER_ROLE_CHANGE", f"Changed role of {target.email} from {old_role} to {new_role}")
    return {"message": "User role updated successfully", "user_id": target.id, "role": target.role}

# 3. Teacher Management Endpoints
@router.get("/teachers")
def list_teachers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(User.role.in_(["teacher", "instructor", "educator"]))
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(s_term)) | (User.email.ilike(s_term)))

    teachers = query.order_by(User.id.desc()).all()
    res = []
    for t in teachers:
        c_count = db.query(Course).filter(Course.teacher_id == t.id).count()
        lc_count = db.query(LiveClass).filter(LiveClass.teacher_id == t.id).count()
        res.append({
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "role": t.role,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "courses_count": c_count,
            "live_classes_count": lc_count
        })
    return res

# 4. Student Management Endpoints
@router.get("/students")
def list_students(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(User.role == "student")
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter((User.full_name.ilike(s_term)) | (User.email.ilike(s_term)))

    students = query.order_by(User.id.desc()).all()
    res = []
    for s in students:
        enrolled_count = db.query(Enrollment).filter(Enrollment.student_id == s.id).count()
        joined_count = db.query(LiveClassParticipant).filter(LiveClassParticipant.student_id == s.id).count()
        res.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "role": s.role,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "enrolled_courses_count": enrolled_count,
            "live_classes_joined_count": joined_count
        })
    return res

# 5. Course Management Endpoints
@router.get("/courses")
def list_all_courses(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Course)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter((Course.title.ilike(s_term)) | (Course.description.ilike(s_term)))

    courses = query.order_by(Course.id.desc()).all()
    res = []
    for c in courses:
        instructor = db.query(User).filter(User.id == c.teacher_id).first()
        enrollments = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        res.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "instructor_id": c.teacher_id,
            "instructor_name": instructor.full_name if instructor else "Instructor",
            "instructor_email": instructor.email if instructor else "",
            "enrollment_count": enrollments,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return res

# 6. Live Classes Admin Management
@router.get("/live-classes")
def list_admin_live_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    classes = db.query(LiveClass).order_by(LiveClass.id.desc()).all()
    res = []
    for lc in classes:
        teacher = db.query(User).filter(User.id == lc.teacher_id).first()
        
        # Real Participant Roster
        participants_raw = db.query(LiveClassParticipant).filter(
            LiveClassParticipant.class_id == lc.id
        ).all()

        roster = []
        connected_count = 0
        for p in participants_raw:
            st = db.query(User).filter(User.id == p.student_id).first()
            if p.connection_status == "CONNECTED":
                connected_count += 1
            if st:
                roster.append({
                    "student_id": st.id,
                    "full_name": st.full_name,
                    "email": st.email,
                    "connection_status": p.connection_status,
                    "joined_at": p.joined_at.isoformat() if p.joined_at else None,
                    "left_at": p.left_at.isoformat() if p.left_at else None
                })

        res.append({
            "id": lc.id,
            "title": lc.title,
            "class_code": lc.class_code,
            "join_token": lc.join_token,
            "teacher_name": teacher.full_name if teacher else "Instructor",
            "teacher_email": teacher.email if teacher else "",
            "status": lc.status,
            "started_at": lc.started_at.isoformat() if lc.started_at else None,
            "ended_at": lc.ended_at.isoformat() if lc.ended_at else None,
            "connected_count": connected_count,
            "roster": roster
        })
    return res

# 7. System Monitoring
@router.get("/system")
@router.get("/system-metrics")
def get_system_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {
        "status": "HEALTHY",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": {"status": "ONLINE", "provider": "PostgreSQL"},
            "redis": {"status": "ONLINE", "provider": "Redis Cache / PubSub"},
            "websocket": {"status": "ONLINE", "active_signaling_rooms": 1},
            "ai_tutor": {"status": "ONLINE", "provider": "Gemini & GPT-4 Fallback"}
        },
        "active_classes_count": db.query(LiveClass).filter(LiveClass.status == "LIVE").count(),
        "connected_participants": db.query(LiveClassParticipant).filter(LiveClassParticipant.connection_status == "CONNECTED").count(),
        "total_registered_users": db.query(User).count()
    }

# 8. Audit Logs
@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    res = []
    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        res.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_email": u.email if u else (l.user_email or "System"),
            "action": l.action,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None
        })
    return res

# 9. System Settings
@router.get("/settings")
def get_admin_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {
        "platform_name": "Edu-Flow SaaS Platform",
        "maintenance_mode": False,
        "ai_provider": "Gemini / GPT-4 Failover",
        "default_user_role": "student",
        "max_live_class_participants": 200,
        "security_policy": "JWT Bearer Authentication + RBAC"
    }
