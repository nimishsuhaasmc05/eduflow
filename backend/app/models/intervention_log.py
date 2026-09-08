"""
INTERVENTION LOG MODEL
======================
Tracks every intervention decision with BEFORE and AFTER learner metrics.
Enables closed-loop measurement: did the intervention actually improve attention?

Fields:
  - pre_state / pre_attention / pre_confusion: State at moment of intervention
  - post_state / post_attention / post_confusion: State after intervention (filled later)
  - success: Boolean computed from before/after comparison
  - escalation_level: 1=nudge, 2=explanation, 3=quiz, 4=break
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from app.core.database import Base


class InterventionLog(Base):
    __tablename__ = "intervention_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("course_modules.id"), nullable=True)

    # Intervention details
    intervention_id = Column(String, unique=True, nullable=False, index=True)  # e.g., "INT-ABCD1234"
    intervention_type = Column(String, nullable=False)  # FOCUS_NUDGE, SIMPLIFY_EXPLANATION, MICRO_QUIZ, TAKE_BREAK
    escalation_level = Column(Integer, default=1)  # 1=nudge, 2=explain, 3=quiz, 4=break

    # BEFORE intervention (captured at decision time)
    pre_state = Column(String, nullable=False, default="FOCUSED")  # FOCUSED | NEEDS_SUPPORT | DISTRACTED | INACTIVE
    pre_attention = Column(Float, nullable=True)
    pre_confusion = Column(Float, nullable=True)
    pre_engagement = Column(Float, nullable=True)

    # AFTER intervention (filled by outcome report)
    post_state = Column(String, nullable=True)
    post_attention = Column(Float, nullable=True)
    post_confusion = Column(Float, nullable=True)
    post_engagement = Column(Float, nullable=True)
    quiz_score = Column(Float, nullable=True)  # If intervention included a quiz

    # Outcome
    success = Column(Boolean, nullable=True)  # True if attention improved after intervention
    dismissed = Column(Boolean, default=False)  # True if student dismissed without engaging

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)  # When outcome was recorded
