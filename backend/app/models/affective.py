from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from app.core.database import Base

class AffectiveTelemetry(Base):
    __tablename__ = "affective_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)
    timestamp_seconds = Column(Float, default=0.0)
    
    # Primary Affective Metrics (0.0 to 1.0)
    attention = Column(Float, nullable=False, default=0.85)
    confusion = Column(Float, nullable=False, default=0.15)
    boredom = Column(Float, nullable=False, default=0.10)
    engagement = Column(Float, nullable=False, default=0.90)
    distraction = Column(Float, nullable=False, default=0.05)
    cognitive_load = Column(Float, nullable=False, default=0.45)
    
    # Intervention details
    primary_state = Column(String, default="ENGAGED")
    intervention_triggered = Column(String, nullable=True)  # e.g., "SIMPLIFY_EXPLANATION", "QUIZ", "PAUSE_BREAK"
    created_at = Column(DateTime, default=datetime.utcnow)
