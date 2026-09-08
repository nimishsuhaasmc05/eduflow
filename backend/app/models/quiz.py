from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, JSON
from app.core.database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)
    title = Column(String, nullable=False)
    target_affect_state = Column(String, default="CONFUSION")  # Generated dynamically in response to confusion/boredom
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of strings e.g. ["Option A", "Option B", ...]
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    difficulty_level = Column(String, default="Medium")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score_percentage = Column(Float, nullable=False)
    total_questions = Column(Integer, default=5)
    correct_answers = Column(Integer, default=5)
    affective_state_before = Column(String, nullable=True)
    affective_state_after = Column(String, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)
