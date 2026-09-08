from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class AffectiveFramePayload(BaseModel):
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    timestamp_seconds: float = 0.0
    
    # 0.0 to 1.0
    attention: float = Field(..., ge=0.0, le=1.0)
    confusion: float = Field(..., ge=0.0, le=1.0)
    boredom: float = Field(..., ge=0.0, le=1.0)
    engagement: float = Field(..., ge=0.0, le=1.0)
    distraction: float = Field(..., ge=0.0, le=1.0)
    cognitive_load: float = Field(..., ge=0.0, le=1.0)
    
    # Learner state classification (from frontend classifier)
    learner_state: Optional[str] = "FOCUSED"    # FOCUSED | NEEDS_SUPPORT | DISTRACTED | INACTIVE
    eye_state: Optional[str] = "OPEN"           # OPEN | PARTIALLY_CLOSED | CLOSED | NORMAL_BLINK | PROLONGED_CLOSURE
    blink_count: Optional[int] = 0
    recent_quiz_score: Optional[float] = None    # Most recent quiz score if available

class AffectiveTelemetryResponse(AffectiveFramePayload):
    id: int
    student_id: int
    primary_state: str
    intervention_triggered: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ClosedLoopInterventionResponse(BaseModel):
    action_required: bool
    intervention_type: str  # e.g., "NONE", "FOCUS_NUDGE", "SIMPLIFY_EXPLANATION", "INTERACTIVE_QUIZ", "TAKE_BREAK", "TARGETED_QUIZ", "GENTLE_PROMPT", "POSITIVE_REINFORCEMENT"
    message: str
    suggested_content: Optional[str] = None
    adaptive_quiz_id: Optional[int] = None
    intervention_id: Optional[str] = None          # For tracking intervention outcomes
    cooldown_remaining_seconds: Optional[int] = 0  # Seconds until next intervention can fire
