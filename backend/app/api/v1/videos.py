import os
import uuid
import time
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
from app.models.course import VideoKnowledge, Module, Course
from app.schemas.ai import VideoAnalysisRequest, VideoAnalysisResponse
from app.services.video_knowledge_service import VideoKnowledgeService

router = APIRouter(prefix="/videos", tags=["Video Ingestion & Analysis"])

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    course_id: Optional[int] = Form(None),
    module_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Secure video upload endpoint for teachers.
    - Requires authentication & teacher role.
    - Validates file extension (.mp4, .webm, .mov, .avi) and MIME type.
    - Validates file size (max configured size).
    - Generates unique server-side filename and prevents path traversal.
    - Uses chunked streaming upload to prevent excessive memory usage.
    """
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher authorization required to upload course videos."
        )

    if course_id is not None:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail=f"Course {course_id} not found.")
        if current_user.role != "admin" and course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to modify this course.")

    # Validate file extension
    original_filename = file.filename or "video.mp4"
    _, ext = os.path.splitext(original_filename)
    ext = ext.lower()
    if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        allowed_str = ", ".join([e.upper().replace(".", "") for e in settings.ALLOWED_VIDEO_EXTENSIONS])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{ext}'. Supported formats: {allowed_str}."
        )

    # Validate MIME type where provided
    content_type = (file.content_type or "").lower()
    valid_mime_prefixes = ("video/", "application/octet-stream")
    if content_type and not any(content_type.startswith(p) for p in valid_mime_prefixes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Must be a valid video stream."
        )

    # Prepare safe storage path
    uploads_dir = os.path.join(settings.MEDIA_DIR, "uploads", "videos")
    os.makedirs(uploads_dir, exist_ok=True)

    unique_token = uuid.uuid4().hex[:16]
    safe_timestamp = int(time.time())
    server_filename = f"video_{unique_token}_{safe_timestamp}{ext}"
    destination_path = os.path.abspath(os.path.join(uploads_dir, server_filename))

    # Path traversal protection
    if not destination_path.startswith(os.path.abspath(uploads_dir)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid destination path.")

    # Chunked streaming write with size limit enforcement
    max_bytes = settings.MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024
    total_size = 0
    chunk_size = 1024 * 1024  # 1MB per chunk

    try:
        with open(destination_path, "wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_bytes:
                    buffer.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File size exceeds maximum allowed limit of {settings.MAX_VIDEO_UPLOAD_SIZE_MB}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(destination_path):
            try:
                os.remove(destination_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to write uploaded video to storage.")

    if total_size == 0:
        if os.path.exists(destination_path):
            os.remove(destination_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded video file is empty.")

    video_url = f"/media/uploads/videos/{server_filename}"

    # If module_id was supplied, update the module record directly
    if module_id is not None:
        mod = db.query(Module).filter(Module.id == module_id).first()
        if mod:
            if course_id is not None and mod.course_id != course_id:
                raise HTTPException(status_code=400, detail="Module does not belong to the specified course.")
            mod.video_url = video_url
            mod.source_type = "uploaded_file"
            db.commit()
            db.refresh(mod)

    return {
        "status": "SUCCESS",
        "video_url": video_url,
        "original_filename": original_filename,
        "stored_filename": server_filename,
        "file_size_bytes": total_size,
        "source_type": "uploaded_file",
        "course_id": course_id,
        "module_id": module_id
    }

@router.post("/analyze", response_model=VideoAnalysisResponse)
def analyze_video(
    req: VideoAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests video URL, validates metadata & transcript, extracts structured knowledge via Gemini,
    and persists knowledge in PostgreSQL.
    """
    if not req.video_url or len(req.video_url.strip()) < 5:
        raise HTTPException(status_code=400, detail="Invalid video URL provided")

    vk = VideoKnowledgeService.get_or_create_knowledge(
        db=db,
        course_id=req.course_id,
        module_id=req.module_id,
        video_url=req.video_url,
        title=req.title or "",
        description=req.description or "",
        transcript=req.transcript,
        force_reanalyze=req.force_reanalyze or False
    )

    if not vk:
        raise HTTPException(status_code=500, detail="Video knowledge extraction failed")

    return VideoAnalysisResponse(
        status="READY",
        video_id=vk.video_id,
        topic=vk.detected_topic or vk.topic or "Video Lesson",
        subject=vk.subject or "Computer Science",
        summary=vk.summary or "",
        learning_objectives=vk.learning_objectives if isinstance(vk.learning_objectives, list) else [],
        concepts=vk.concepts if isinstance(vk.concepts, list) else [],
        definitions=vk.definitions if isinstance(vk.definitions, dict) else {},
        important_points=vk.important_points if isinstance(vk.important_points, list) else [],
        examples=vk.examples if isinstance(vk.examples, list) else [],
        procedures=vk.procedures if isinstance(vk.procedures, list) else [],
        formulas=vk.formulas if isinstance(vk.formulas, list) else [],
        timestamps=vk.timestamps if isinstance(vk.timestamps, dict) else {},
        source_type=vk.source_type or "video_analysis",
        confidence=vk.confidence or 0.95,
        analysis_model=vk.analysis_model or "gemini-3.6-flash",
        analysis_version=vk.analysis_version or "v1.0"
    )

from app.services.course_security import CourseSecurityService

@router.get("/{video_id}/knowledge", response_model=VideoAnalysisResponse)
def get_video_knowledge(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vk = db.query(VideoKnowledge).filter(VideoKnowledge.video_id == video_id).first()
    if not vk:
        raise HTTPException(status_code=404, detail=f"Knowledge record not found for video_id={video_id}")

    if vk.course_id:
        CourseSecurityService.verify_course_entitlement(db, current_user, vk.course_id)

    return VideoAnalysisResponse(
        status="READY",
        video_id=vk.video_id,
        topic=vk.detected_topic or vk.topic or "Video Lesson",
        subject=vk.subject or "Computer Science",
        summary=vk.summary or "",
        learning_objectives=vk.learning_objectives if isinstance(vk.learning_objectives, list) else [],
        concepts=vk.concepts if isinstance(vk.concepts, list) else [],
        definitions=vk.definitions if isinstance(vk.definitions, dict) else {},
        important_points=vk.important_points if isinstance(vk.important_points, list) else [],
        examples=vk.examples if isinstance(vk.examples, list) else [],
        procedures=vk.procedures if isinstance(vk.procedures, list) else [],
        formulas=vk.formulas if isinstance(vk.formulas, list) else [],
        timestamps=vk.timestamps if isinstance(vk.timestamps, dict) else {},
        source_type=vk.source_type or "video_analysis",
        confidence=vk.confidence or 0.95,
        analysis_model=vk.analysis_model or "gemini-3.6-flash",
        analysis_version=vk.analysis_version or "v1.0"
    )

@router.get("/module/{module_id}/knowledge", response_model=VideoAnalysisResponse)
def get_module_video_knowledge(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mod = db.query(Module).filter(Module.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail=f"Module not found for module_id={module_id}")

    CourseSecurityService.verify_course_entitlement(db, current_user, mod.course_id)

    vk = db.query(VideoKnowledge).filter(VideoKnowledge.module_id == module_id).first()
    if not vk and mod.video_url:
        vk = VideoKnowledgeService.get_or_create_knowledge(
            db=db,
            course_id=mod.course_id,
            module_id=mod.id,
            video_url=mod.video_url,
            title=mod.title or "",
            description=mod.description or "",
            transcript=mod.transcript
        )

    if not vk:
        raise HTTPException(status_code=404, detail=f"Knowledge record not found for module_id={module_id}")

    return VideoAnalysisResponse(
        status="READY",
        video_id=vk.video_id,
        topic=vk.detected_topic or vk.topic or "Video Lesson",
        subject=vk.subject or "Computer Science",
        summary=vk.summary or "",
        learning_objectives=vk.learning_objectives if isinstance(vk.learning_objectives, list) else [],
        concepts=vk.concepts if isinstance(vk.concepts, list) else [],
        definitions=vk.definitions if isinstance(vk.definitions, dict) else {},
        important_points=vk.important_points if isinstance(vk.important_points, list) else [],
        examples=vk.examples if isinstance(vk.examples, list) else [],
        procedures=vk.procedures if isinstance(vk.procedures, list) else [],
        formulas=vk.formulas if isinstance(vk.formulas, list) else [],
        timestamps=vk.timestamps if isinstance(vk.timestamps, dict) else {},
        source_type=vk.source_type or "video_analysis",
        confidence=vk.confidence or 0.95,
        analysis_model=vk.analysis_model or "gemini-3.6-flash",
        analysis_version=vk.analysis_version or "v1.0"
    )

import time
from jose import jwt, JWTError
from app.core.config import settings

@router.post("/stream-token")
def generate_stream_token(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    module_id = payload.get("module_id")
    if not module_id:
        raise HTTPException(status_code=400, detail="module_id is required")

    mod = db.query(Module).filter(Module.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    CourseSecurityService.verify_course_entitlement(db, current_user, mod.course_id)

    # Generate 5-minute short-lived signed stream token
    stream_payload = {
        "sub": str(current_user.id),
        "module_id": mod.id,
        "course_id": mod.course_id,
        "exp": int(time.time()) + 300  # Expires in 300 seconds
    }
    signed_token = jwt.encode(stream_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return {
        "stream_url": f"/api/v1/videos/stream/{mod.id}?st={signed_token}",
        "expires_in": 300,
        "video_url": mod.video_url if mod.video_url else None
    }

@router.get("/stream/{module_id}")
def get_protected_video_stream(
    module_id: int,
    st: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_to_verify = current_user
    if not user_to_verify and st:
        try:
            payload = jwt.decode(st, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = int(payload.get("sub"))
            user_to_verify = db.query(User).filter(User.id == user_id).first()
        except JWTError:
            raise HTTPException(status_code=403, detail="Stream authorization expired or invalid signature.")

    if not user_to_verify:
        raise HTTPException(status_code=401, detail="Authentication required for video stream.")

    mod = db.query(Module).filter(Module.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    CourseSecurityService.verify_course_entitlement(db, user_to_verify, mod.course_id)

    return {
        "status": "AUTHORIZED",
        "module_id": mod.id,
        "course_id": mod.course_id,
        "video_url": mod.video_url
    }
