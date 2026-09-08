"""
AFFECTIVE CLOSED-LOOP ENGINE
=============================
Bridges telemetry ingestion → intervention decision → measurement.
Handles:
  1. Processing incoming affective telemetry frames
  2. Delegating to the InterventionEngine for DECIDE phase
  3. Persisting telemetry to PostgreSQL
  4. Recording intervention outcomes (MEASURE phase)
  5. Updating LearnerProfile (ADAPT phase)
"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models.affective import AffectiveTelemetry
from app.schemas.affective import AffectiveFramePayload, ClosedLoopInterventionResponse
from app.core.config import settings
from app.services.intervention_engine import InterventionEngine

import logging
logger = logging.getLogger(__name__)


class AffectiveClosedLoopEngine:
    @staticmethod
    def process_telemetry(db: Session, student_id: int, payload: AffectiveFramePayload) -> ClosedLoopInterventionResponse:
        # Determine dominant affective state from metrics
        metrics = {
            "CONFUSION": payload.confusion,
            "DISTRACTION": payload.distraction,
            "BOREDOM": payload.boredom,
            "HIGH_COGNITIVE_LOAD": payload.cognitive_load,
            "ENGAGED": payload.engagement
        }

        primary_state = max(metrics, key=metrics.get)

        # Use the learner state from frontend classifier if provided, otherwise derive from metrics
        learner_state = (payload.learner_state or "FOCUSED").upper()
        if learner_state not in ("FOCUSED", "NEEDS_SUPPORT", "DISTRACTED", "INACTIVE"):
            # Fallback: derive from old-style thresholds
            if payload.confusion >= settings.CONFUSION_THRESHOLD or payload.distraction >= settings.DISTRACTION_THRESHOLD:
                learner_state = "DISTRACTED"
            elif payload.boredom >= settings.BOREDOM_THRESHOLD:
                learner_state = "NEEDS_SUPPORT"
            else:
                learner_state = "FOCUSED"

        # Use the Intervention Engine for smart decision making
        # Now passes db session for DB-backed persistence and adaptive history loading
        decision = InterventionEngine.decide(
            student_id=student_id,
            learner_state=learner_state,
            attention=payload.attention,
            confusion=payload.confusion,
            boredom=payload.boredom,
            distraction=payload.distraction,
            engagement=payload.engagement,
            cognitive_load=payload.cognitive_load,
            eye_state=payload.eye_state or "OPEN",
            recent_quiz_score=payload.recent_quiz_score,
            db=db,
        )

        intervention_action = decision.get("intervention_type", "NONE")
        action_required = decision.get("action_required", False)

        # Save Telemetry Record (with new fields: eye_state, learner_state, blink_count)
        telemetry_entry = AffectiveTelemetry(
            student_id=student_id,
            course_id=payload.course_id,
            module_id=payload.module_id,
            timestamp_seconds=payload.timestamp_seconds,
            attention=payload.attention,
            confusion=payload.confusion,
            boredom=payload.boredom,
            engagement=payload.engagement,
            distraction=payload.distraction,
            cognitive_load=payload.cognitive_load,
            primary_state=primary_state,
            intervention_triggered=intervention_action if action_required else None
        )
        db.add(telemetry_entry)
        db.commit()

        # Update LearnerProfile with rolling metrics (ADAPT phase)
        AffectiveClosedLoopEngine._update_learner_profile(db, student_id, payload)

        return ClosedLoopInterventionResponse(
            action_required=action_required,
            intervention_type=intervention_action,
            message=decision.get("message", ""),
            suggested_content=decision.get("suggested_content"),
            adaptive_quiz_id=1 if intervention_action in ("INTERACTIVE_QUIZ", "TARGETED_QUIZ", "MICRO_QUIZ") else None,
            intervention_id=decision.get("intervention_id"),
            cooldown_remaining_seconds=decision.get("cooldown_remaining_seconds", 0)
        )

    @staticmethod
    def process_intervention_outcome(
        db: Session,
        intervention_id: str,
        post_attention: float,
        post_confusion: float,
        post_state: str,
        post_engagement: float = 0.0,
        quiz_score: float = None
    ) -> dict:
        """
        MEASURE phase: Record what happened AFTER an intervention.
        Called by the frontend after the student interacted with the intervention.
        """
        success = InterventionEngine.resolve_intervention(
            db=db,
            intervention_id=intervention_id,
            post_state=post_state,
            post_attention=post_attention,
            post_confusion=post_confusion,
            post_engagement=post_engagement,
            quiz_score=quiz_score,
        )

        return {
            "intervention_id": intervention_id,
            "success": success,
            "post_state": post_state,
            "message": "Intervention outcome recorded successfully."
        }

    @staticmethod
    def _update_learner_profile(db: Session, student_id: int, payload: AffectiveFramePayload):
        """
        ADAPT phase: Update the learner's profile with rolling metrics.
        This enables the system to build a longitudinal picture of the learner.
        """
        try:
            from app.models.learner_profile import LearnerProfile

            profile = db.query(LearnerProfile).filter(
                LearnerProfile.user_id == student_id
            ).first()

            if not profile:
                # Create profile on first telemetry
                profile = LearnerProfile(user_id=student_id)
                db.add(profile)
                db.commit()
                db.refresh(profile)

            # Update rolling focus trend (keep last 50 data points)
            focus_trend = profile.focus_score_trend or []
            if isinstance(focus_trend, list):
                focus_trend.append(round(payload.attention, 3))
                if len(focus_trend) > 50:
                    focus_trend = focus_trend[-50:]
                profile.focus_score_trend = focus_trend

            # Update rolling confusion trend
            confusion_trend = profile.confusion_trend or []
            if isinstance(confusion_trend, list):
                confusion_trend.append(round(payload.confusion, 3))
                if len(confusion_trend) > 50:
                    confusion_trend = confusion_trend[-50:]
                profile.confusion_trend = confusion_trend

            # Update intervention stats
            stats = InterventionEngine.get_student_intervention_stats(db, student_id)
            if stats["success_rate"] is not None:
                profile.intervention_effectiveness = stats["success_rate"] / 100.0

            profile.updated_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            logger.debug(f"LearnerProfile update skipped: {e}")
            try:
                db.rollback()
            except Exception:
                pass
