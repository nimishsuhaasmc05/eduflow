from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text, JSON
from app.core.database import Base

class LiveClass(Base):
    __tablename__ = "live_classes"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    class_code = Column(String(20), unique=True, index=True, nullable=False)
    join_token = Column(String(64), unique=True, index=True, nullable=False)
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="SCHEDULED")  # SCHEDULED, LIVE, ENDED, CANCELLED
    zoom_meeting_id = Column(String(50), nullable=True)
    zoom_passcode = Column(String(20), nullable=True)
    zoom_join_url = Column(String(255), nullable=True)
    zoom_start_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LiveClassParticipant(Base):
    __tablename__ = "live_class_participants"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    attendance_duration_seconds = Column(Float, default=0.0)
    connection_status = Column(String(20), default="CONNECTED")  # CONNECTED, DISCONNECTED, RECONNECTING

class ClassEngagementSample(Base):
    __tablename__ = "class_engagement_samples"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp_seconds = Column(Float, default=0.0)
    focus_score = Column(Float, default=0.85)
    confusion_score = Column(Float, default=0.15)
    distraction_score = Column(Float, default=0.05)
    cognitive_load_score = Column(Float, default=0.40)
    engagement_score = Column(Float, default=0.85)
    primary_state = Column(String(30), default="FOCUSED")  # FOCUSED, CONFUSED, DISTRACTED, BORED, HIGH_COGNITIVE_LOAD, UNKNOWN
    created_at = Column(DateTime, default=datetime.utcnow)

class ClassEvent(Base):
    __tablename__ = "class_events"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)  # JOIN, LEAVE, QUESTION, QUIZ_START, QUIZ_SUBMIT, INTERVENTION, RECONNECT
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ClassQuiz(Base):
    __tablename__ = "class_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("live_classes.id"), nullable=False)
    topic = Column(String(255), nullable=False)
    difficulty = Column(String(20), default="MEDIUM")
    questions_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClassQuizAttempt(Base):
    __tablename__ = "class_quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("class_quizzes.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score_percentage = Column(Float, default=0.0)
    answers_json = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

class ClassReport(Base):
    __tablename__ = "class_reports"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("live_classes.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    total_enrolled = Column(Integer, default=0)
    attended_count = Column(Integer, default=0)
    average_attendance_pct = Column(Float, default=0.0)
    average_engagement = Column(Float, default=0.0)
    average_focus = Column(Float, default=0.0)
    average_confusion = Column(Float, default=0.0)
    average_distraction = Column(Float, default=0.0)
    average_cognitive_load = Column(Float, default=0.0)
    topic_analysis_json = Column(JSON, nullable=True)
    difficult_sections_json = Column(JSON, nullable=True)
    quiz_performance_json = Column(JSON, nullable=True)
    ai_recommendations_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
