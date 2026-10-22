from fastapi import APIRouter, Depends, UploadFile, File, Query
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.affective import AffectiveFramePayload, ClosedLoopInterventionResponse
from app.services.affective_engine import AffectiveClosedLoopEngine

router = APIRouter(prefix="/affective", tags=["Affective Telemetry & Closed Loop"])

@router.post("/telemetry", response_model=ClosedLoopInterventionResponse)
def process_affective_frame(
    payload: AffectiveFramePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return AffectiveClosedLoopEngine.process_telemetry(db, current_user.id, payload)


class InterventionOutcomePayload(BaseModel):
    """Payload sent by frontend after student interacts with an intervention."""
    intervention_id: str
    post_attention: float = Field(..., ge=0.0, le=1.0)
    post_confusion: float = Field(..., ge=0.0, le=1.0)
    post_state: str = "FOCUSED"  # FOCUSED | NEEDS_SUPPORT | DISTRACTED | INACTIVE
    post_engagement: float = Field(default=0.0, ge=0.0, le=1.0)
    quiz_score: Optional[float] = None  # If a quiz was completed as part of the intervention


@router.post("/intervention-outcome")
def report_intervention_outcome(
    payload: InterventionOutcomePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    MEASURE endpoint: Frontend reports what happened after an intervention.
    Records post-intervention metrics and computes success/failure.
    """
    result = AffectiveClosedLoopEngine.process_intervention_outcome(
        db=db,
        intervention_id=payload.intervention_id,
        post_attention=payload.post_attention,
        post_confusion=payload.post_confusion,
        post_state=payload.post_state,
        post_engagement=payload.post_engagement,
        quiz_score=payload.quiz_score,
    )
    return result


@router.post("/analyze-frame")
async def analyze_frame(
    file: UploadFile = File(...),
    engine: str = Query("ensemble", description="Engine to use: 'ensemble', 'affectnet', or 'huggingface'"),
    current_user: User = Depends(get_current_user)
):
    """
    Direct server-side affective evaluation endpoint for uploaded frames or test images.
    Returns primary affective state, attention score, confusion, boredom, cognitive load,
    and detailed outputs from AffectNet and Hugging Face FER models.
    """
    from app.services.opencv_vision import OpenCVVisionEngine

    content = await file.read()
    result = OpenCVVisionEngine.process_frame(content, engine=engine)
    return {
        "user_id": current_user.id,
        "engine_used": engine,
        "analysis": result
    }

