from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, JSON
from app.core.database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, default="Computer Science")
    difficulty = Column(String, default="Intermediate")
    thumbnail_url = Column(String, nullable=True)
    status = Column(String, default="published")  # published, draft, archived
    learning_objectives = Column(Text, nullable=True)
    duration_hours = Column(Float, default=5.0)
    rating = Column(Float, default=4.8)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Module(Base):
    __tablename__ = "course_modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=1)
    duration_minutes = Column(Integer, default=15)
    video_url = Column(String, nullable=True)
    source_type = Column(String, default="url")  # url, uploaded_file
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    progress_percentage = Column(Float, default=0.0)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    is_completed = Column(Boolean, default=False)

class VideoKnowledge(Base):
    __tablename__ = "video_knowledge"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, index=True, nullable=True)
    video_url = Column(String, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)
    title = Column(String, nullable=True)
    detected_topic = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    subject = Column(String, default="Computer Science")
    summary = Column(Text, nullable=True)
    learning_objectives = Column(Text, nullable=True)
    concepts = Column(JSON, nullable=True)
    definitions = Column(JSON, nullable=True)
    important_points = Column(JSON, nullable=True)
    examples = Column(JSON, nullable=True)
    procedures = Column(JSON, nullable=True)
    formulas = Column(JSON, nullable=True)
    timestamps = Column(JSON, nullable=True)
    transcript = Column(Text, nullable=True)
    source_type = Column(String, default="combined")
    confidence = Column(Float, default=0.95)
    analysis_model = Column(String, default="gemini-3.6-flash")
    analysis_version = Column(String, default="v1.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    certificate_code = Column(String, unique=True, nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)


class RAGChunk(Base):
    """Stores chunked course content for TF-IDF based RAG retrieval."""
    __tablename__ = "rag_chunks"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    source_type = Column(String, default="transcript")  # transcript, description, video_knowledge
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)




class ActivityEvent(Base):
    """Tracks real student learning events in PostgreSQL for authentic timeline display."""
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)
    event_type = Column(String, nullable=False, index=True)  # COURSE_ENROLLED, MODULE_COMPLETED, AI_TUTOR_USED, QUIZ_PASSED, CERTIFICATE_CLAIMED, etc.
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    xp_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

