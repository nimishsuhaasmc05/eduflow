from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.course import Course, Module
from app.core.security import get_password_hash

from app.api.v1 import auth, users, courses, affective, ai_tutor, quizzes, teacher, admin, videos, live_classes

# Create tables
Base.metadata.create_all(bind=engine)

try:
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"))
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'published';"))
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT;"))
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours FLOAT DEFAULT 5.0;"))
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8;"))
        conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS description TEXT;"))
        conn.execute(text("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS source_type VARCHAR DEFAULT 'url';"))
        conn.commit()
except Exception as migration_err:
    print(f"Migration note: {migration_err}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.netlify\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request

@app.middleware("http")
async def add_security_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(courses.router, prefix=settings.API_V1_STR)
app.include_router(videos.router, prefix=settings.API_V1_STR)
app.include_router(affective.router, prefix=settings.API_V1_STR)
app.include_router(ai_tutor.router, prefix=settings.API_V1_STR)
app.include_router(quizzes.router, prefix=settings.API_V1_STR)
app.include_router(teacher.router, prefix=settings.API_V1_STR)
app.include_router(live_classes.router, prefix=settings.API_V1_STR)
app.include_router(live_classes.router, prefix="/api")
app.include_router(live_classes.router, prefix="/api/online-classes", tags=["online-classes"])
app.include_router(live_classes.router, prefix="/api/v1/online-classes", tags=["online-classes"])

# Direct WebRTC Signaling Route Alias
from fastapi import WebSocket, WebSocketDisconnect
from app.api.v1.live_classes import manager
import json

@app.websocket("/ws/class/{room_id}")
async def direct_signaling(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                await manager.broadcast(msg, room_id)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# Direct Route Aliases for Library & Tutor Ask
from app.schemas.ai import GeminiTopicRequest, GeminiTopicResponse, AITutorQuery, AITutorResponse
from app.services.gemini_service import GeminiService
from app.services.ai_tutor_service import AITutorService
from app.api.deps import get_current_user

@app.post("/api/v1/tutor/ask", response_model=AITutorResponse)
@app.post("/api/tutor/ask", response_model=AITutorResponse)
def direct_tutor_ask(query: AITutorQuery, current_user: User = Depends(get_current_user)):
    return AITutorService.generate_response(query)

@app.post("/api/library/ask-gemini", response_model=GeminiTopicResponse)
@app.post("/api/v1/library/ask-gemini", response_model=GeminiTopicResponse)
def direct_library_ask_gemini(req: GeminiTopicRequest, current_user: User = Depends(get_current_user)):
    return GeminiService.generate_topic_breakdown(req)

@app.on_event("startup")
def seed_database():
    from sqlalchemy import text
    from app.core.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'published';"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT;"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_hours FLOAT DEFAULT 5.0;"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8;"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS description TEXT;"))
            conn.execute(text("ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS source_type VARCHAR DEFAULT 'url';"))
            conn.execute(text("ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 1;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS pre_state VARCHAR DEFAULT 'FOCUSED';"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS pre_attention FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS pre_confusion FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS pre_engagement FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS post_state VARCHAR;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS post_attention FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS post_confusion FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS post_engagement FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS quiz_score FLOAT;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE intervention_logs ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;"))
            conn.commit()
    except Exception as e:
        print("Database migration notice:", e)

    db = SessionLocal()
    try:
        # Seed Admin
        admin_user = db.query(User).filter(User.email == "admin@eduflow.ai").first()
        if not admin_user:
            admin_user = User(
                email="admin@eduflow.ai",
                username="admin",
                full_name="EduFlow System Administrator",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Seed Teacher
        teacher_user = db.query(User).filter(User.email == "teacher@eduflow.ai").first()
        if not teacher_user:
            teacher_user = User(
                email="teacher@eduflow.ai",
                username="dr_sarah",
                full_name="Dr. Sarah Jenkins (AI & Cognitive Systems)",
                hashed_password=get_password_hash("teacher123"),
                role="teacher"
            )
            db.add(teacher_user)
            db.commit()
            db.refresh(teacher_user)

        # Seed Student
        student_user = db.query(User).filter(User.email == "student@eduflow.ai").first()
        if not student_user:
            student_user = User(
                email="student@eduflow.ai",
                username="alex_learner",
                full_name="Alex Rivera",
                hashed_password=get_password_hash("student123"),
                role="student",
                total_xp=1450,
                streak_days=7
            )
            db.add(student_user)
            db.commit()
            db.refresh(student_user)

        # Seed Demo Courses (3 representative courses)
        if db.query(Course).count() == 0:
            from app.seed_courses import COURSES as SEED_COURSES
            for course_data in SEED_COURSES:
                c = Course(
                    title=course_data["title"],
                    description=course_data["description"],
                    category=course_data["category"],
                    difficulty=course_data["difficulty"],
                    thumbnail_url=course_data["thumbnail_url"],
                    status="published",
                    learning_objectives=course_data.get("learning_objectives"),
                    duration_hours=course_data.get("duration_hours", 5.0),
                    rating=course_data.get("rating", 4.8),
                    teacher_id=teacher_user.id
                )
                db.add(c)
                db.commit()
                db.refresh(c)

                for order, mod_tuple in enumerate(course_data["modules"], start=1):
                    title = mod_tuple[0]
                    desc = mod_tuple[1]
                    duration = mod_tuple[2]
                    v_url = mod_tuple[3] if len(mod_tuple) > 4 else "/media/sample_course_video.mp4"
                    transcript = mod_tuple[4] if len(mod_tuple) > 4 else (mod_tuple[3] if len(mod_tuple) > 3 else "")
                    db.add(Module(
                        course_id=c.id,
                        title=title,
                        description=desc,
                        order=order,
                        duration_minutes=duration,
                        video_url=v_url or "/media/sample_course_video.mp4",
                        transcript=transcript,
                    ))
                db.commit()

                # Auto-index for RAG
                try:
                    from app.services.rag_service import RAGService
                    RAGService.index_course_content(db, c.id)
                except Exception:
                    pass

        # Seed 1 representative active Live Class
        try:
            from app.models.live_class import LiveClass
            active_class = db.query(LiveClass).filter(LiveClass.class_code == "EDF-701").first()
            if not active_class:
                first_course = db.query(Course).first()
                first_module = db.query(Module).filter(Module.course_id == first_course.id).first() if first_course else None
                active_class = LiveClass(
                    title="Real-Time Computer Vision & Socratic Tutoring Workshop",
                    description="Live interactive classroom exploring client-side MediaPipe landmark calculation and closed-loop feedback.",
                    teacher_id=teacher_user.id if teacher_user else (first_course.teacher_id if first_course else 1),
                    course_id=first_course.id if first_course else None,
                    module_id=first_module.id if first_module else None,
                    class_code="EDF-701",
                    join_token="live-class-showcase-token-701",
                    status="LIVE"
                )
                db.add(active_class)
                db.commit()
        except Exception as lc_err:
            db.rollback()
            print(f"Notice: Live class seed notice: {lc_err}")

    except Exception as e:
        db.rollback()
        print(f"Notice: Database seed notice (non-fatal): {e}")
    finally:
        db.close()

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure local media directory exists for uploaded or static videos
media_dir = os.path.join(os.path.dirname(__file__), "media")
os.makedirs(os.path.join(media_dir, "uploads", "videos"), exist_ok=True)
os.makedirs(os.path.join(media_dir, "avatars"), exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("redoc") or full_path == "openapi.json" or full_path.startswith("media/"):
            raise HTTPException(status_code=404, detail="Resource not found")
        target_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": "Edu-Flow Affective-Feedback Adaptive System",
            "status": "Online",
            "version": "1.0.0",
            "docs": "/docs"
        }
