from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from app.core.database import Base

class LearnerProfile(Base):
    """
    LEARNING BEHAVIOR DIGITAL TWIN PROFILE:
    Stores non-sensitive educational metrics: learning progress, quiz accuracy, mastered topics,
    review topics, intervention history, focus trend, confusion trend, pace, and preferred explanation style.
    No facial imagery or biometrics stored for identity.
    """
    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    mastered_topics = Column(JSON, default=list)        # ["Binary Search", "Time Complexity"]
    review_topics = Column(JSON, default=list)          # ["Recursion"]
    avg_quiz_score = Column(Float, default=85.0)
    total_quizzes_completed = Column(Integer, default=0)
    
    preferred_style = Column(String, default="Visual/Interactive")
    learning_pace = Column(String, default="Adaptive")
    
    focus_score_trend = Column(JSON, default=list)      # Recent focus timeline
    confusion_trend = Column(JSON, default=list)        # Recent confusion timeline
    intervention_effectiveness = Column(Float, default=0.90)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
