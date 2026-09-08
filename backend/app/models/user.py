from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False)  # student, teacher, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Student specific stats
    learning_style = Column(String, default="Visual/Interactive")
    cognitive_pace = Column(String, default="Adaptive")
    total_xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=1)
    avg_attention_score = Column(Float, default=0.85)
    avatar_url = Column(String, nullable=True)
