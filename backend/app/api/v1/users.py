import os
import time
import shutil
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.rbac import allow_admin
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(allow_admin)])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validation
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Supported formats: JPEG, PNG, WEBP, GIF."
        )

    # 5MB size limit check
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")

    # Storage directory: backend/media/avatars
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    media_dir = os.path.join(base_dir, "media", "avatars")
    os.makedirs(media_dir, exist_ok=True)

    # Extension extraction
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".png"

    filename = f"avatar_u{current_user.id}_{int(time.time())}{ext}"
    filepath = os.path.join(media_dir, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.avatar_url = f"/media/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me/avatar", response_model=UserResponse)
def remove_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=UserResponse)
@router.get("/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/activities")
def get_my_activities(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ActivityService.get_user_activities(db, current_user.id, limit=limit)

@router.get("/leaderboard", response_model=List[UserResponse])
def get_leaderboard(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.total_xp.desc()).all()

@router.put("/{user_id}/role", response_model=UserResponse, dependencies=[Depends(allow_admin)])
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role not in ["student", "teacher", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = role
    db.commit()
    db.refresh(user)
    return user
