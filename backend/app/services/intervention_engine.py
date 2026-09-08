"""
INTERVENTION ENGINE
==================
Decides the appropriate intervention based on:
  - Current learner state (FOCUSED / NEEDS_SUPPORT / DISTRACTED / INACTIVE)
  - Recent intervention history (escalation logic)
  - Cooldown periods
  - Quiz performance
  - Learner-specific adaptation (Phase 6: ADAPT)

Escalation Ladder (within a session):
  Level 1: FOCUS_NUDGE        — Visual toast, no quiz
  Level 2: SIMPLIFY_EXPLANATION — Suggest AI tutor for help
  Level 3: MICRO_QUIZ          — Pop adaptive quiz
  Level 4: TAKE_BREAK          — Suggest pause + stretch

Decision Table:
  FOCUSED        → CONTINUE (no action, or POSITIVE_REINFORCEMENT if high quiz score)
  NEEDS_SUPPORT  → Escalate from SIMPLIFY_EXPLANATION → MICRO_QUIZ → TAKE_BREAK
  DISTRACTED (1st) → FOCUS_NUDGE
  DISTRACTED (2nd+) → Escalate up the ladder
  INACTIVE       → GENTLE_PROMPT

ADAPT Phase:
  - If last 3 nudges failed → skip nudges, go straight to MICRO_QUIZ
  - If 5+ interventions in 30 min → increase cooldown (fatigue protection)
"""

import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from uuid import uuid4
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Intervention cooldowns and limits
MAX_INTERVENTIONS_PER_10MIN = 3
COOLDOWN_SECONDS = 60              # Minimum gap between interventions (60s cooldown)
ESCALATION_WINDOW_SECONDS = 300    # 5-minute window to count interventions
FATIGUE_WINDOW_SECONDS = 1800      # 30-minute window for fatigue detection
FATIGUE_INTERVENTION_LIMIT = 5     # Max interventions before fatigue cooldown kicks in
FATIGUE_COOLDOWN_SECONDS = 120     # Extended cooldown when fatigued

# Escalation ladder mapping
ESCALATION_LADDER = {
    1: "FOCUS_NUDGE",
    2: "SIMPLIFY_EXPLANATION",
    3: "MICRO_QUIZ",
    4: "TAKE_BREAK",
}


class InterventionEngine:
    """
    Stateful intervention decision engine.
    Maintains per-student history with DB persistence for closed-loop measurement.
    Supports escalation, cooldown adaptation, and learner-specific behavior.
    """

    # In-memory per-student intervention history (session-scoped cache)
    _student_history: Dict[int, list] = {}
    # Track if DB history has been loaded for a student this session
    _db_loaded: Dict[int, bool] = {}
    # Track consecutive ineffective quiz interventions per student
    _ineffective_quiz_counts: Dict[int, int] = {}

    @classmethod
    def reset_ineffective_counter(cls, student_id: int) -> None:
        """Reset consecutive ineffective intervention count for a learner."""
        cls._ineffective_quiz_counts[student_id] = 0

    @classmethod
    def get_ineffective_quiz_count(cls, student_id: int) -> int:
        """Get consecutive ineffective intervention count for a learner."""
        return cls._ineffective_quiz_counts.get(student_id, 0)


    @classmethod
    def _load_from_db(cls, db: Optional[Session], student_id: int) -> None:
        """Load recent intervention history from database on first call per session."""
        if cls._db_loaded.get(student_id) or db is None:
            return
        try:
            from app.models.intervention_log import InterventionLog
            cutoff = datetime.utcnow()
            recent = db.query(InterventionLog).filter(
                InterventionLog.student_id == student_id
            ).order_by(InterventionLog.created_at.desc()).limit(20).all()

            history = cls._student_history.setdefault(student_id, [])
            for log in reversed(recent):
                ts = log.created_at.timestamp() if log.created_at else time.time()
                history.append({
                    "type": log.intervention_type,
                    "time": ts,
                    "level": log.escalation_level or 1,
                    "success": log.success,
                    "intervention_id": log.intervention_id,
                })
            cls._db_loaded[student_id] = True
        except Exception as e:
            logger.warning(f"Could not load intervention history from DB: {e}")
            if db:
                try:
                    db.rollback()
                except Exception:
                    pass
            cls._db_loaded[student_id] = True

    @classmethod
    def _get_recent_failure_count(cls, student_id: int, intervention_type: str, window_seconds: int = 600) -> int:
        """Count recent interventions of a specific type that were NOT successful."""
        now = time.time()
        history = cls._student_history.get(student_id, [])
        return sum(
            1 for h in history
            if now - h["time"] < window_seconds
            and h["type"] == intervention_type
            and h.get("success") is False
        )

    @classmethod
    def _is_fatigued(cls, student_id: int) -> bool:
        """Check if student has received too many interventions recently (fatigue protection)."""
        now = time.time()
        history = cls._student_history.get(student_id, [])
        recent_count = sum(1 for h in history if now - h["time"] < FATIGUE_WINDOW_SECONDS)
        return recent_count >= FATIGUE_INTERVENTION_LIMIT

    @classmethod
    def decide(
        cls,
        student_id: int,
        learner_state: str,
        attention: float = 0.85,
        confusion: float = 0.10,
        boredom: float = 0.10,
        distraction: float = 0.10,
        engagement: float = 0.85,
        cognitive_load: float = 0.30,
        eye_state: str = "OPEN",
        recent_quiz_score: Optional[float] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Returns an intervention decision dict:
        {
            "action_required": bool,
            "intervention_type": str,
            "message": str,
            "suggested_content": str | None,
            "intervention_id": str,
            "cooldown_remaining_seconds": int,
            "escalation_level": int,
            "pre_state": str,
            "pre_attention": float,
            "pre_confusion": float,
            "pre_engagement": float,
        }
        """
        now = time.time()

        # Load DB history on first call this session
        cls._load_from_db(db, student_id)

        history = cls._student_history.setdefault(student_id, [])

        # Prune old history entries
        history[:] = [h for h in history if now - h["time"] < FATIGUE_WINDOW_SECONDS]

        # Check cooldown (use extended cooldown if fatigued)
        effective_cooldown = FATIGUE_COOLDOWN_SECONDS if cls._is_fatigued(student_id) else COOLDOWN_SECONDS
        if history:
            last_time = history[-1]["time"]
            elapsed = now - last_time
            if elapsed < effective_cooldown:
                remaining = int(effective_cooldown - elapsed)
                return cls._no_action(remaining)

        # Check rate limit within escalation window
        recent_in_window = sum(1 for h in history if now - h["time"] < ESCALATION_WINDOW_SECONDS)
        if recent_in_window >= MAX_INTERVENTIONS_PER_10MIN:
            return cls._no_action(0)

        # Count recent interventions of each type for escalation
        nudge_count = sum(1 for h in history if h["type"] == "FOCUS_NUDGE" and now - h["time"] < ESCALATION_WINDOW_SECONDS)
        explanation_count = sum(1 for h in history if h["type"] == "SIMPLIFY_EXPLANATION" and now - h["time"] < ESCALATION_WINDOW_SECONDS)
        quiz_count = sum(1 for h in history if h["type"] == "MICRO_QUIZ" and now - h["time"] < ESCALATION_WINDOW_SECONDS)

        # ADAPT: Check if nudges have been failing → skip to higher escalation
        nudge_failures = cls._get_recent_failure_count(student_id, "FOCUS_NUDGE")
        skip_nudges = nudge_failures >= 3  # If last 3 nudges failed, skip them

        # Determine current escalation level based on recent intervention count
        current_level = recent_in_window + 1  # Start at 1, increment per intervention
        if skip_nudges and current_level == 1:
            current_level = 2  # Skip nudge level

        # ---- DECISION LOGIC ----
        state = (learner_state or "FOCUSED").upper()
        intervention_id = f"INT-{str(uuid4())[:8].upper()}"

        # Pre-state capture for before/after measurement
        pre_context = {
            "pre_state": state,
            "pre_attention": attention,
            "pre_confusion": confusion,
            "pre_engagement": engagement,
            "escalation_level": current_level,
        }

        # FOCUSED → No intervention needed (or positive reinforcement)
        if state == "FOCUSED":
            if recent_quiz_score is not None and recent_quiz_score >= 80:
                result = {
                    "action_required": True,
                    "intervention_type": "POSITIVE_REINFORCEMENT",
                    "message": f"Great work! You scored {int(recent_quiz_score)}% — keep up the excellent focus!",
                    "suggested_content": None,
                    "intervention_id": intervention_id,
                    "cooldown_remaining_seconds": 0,
                    **pre_context
                }
                cls._record(student_id, "POSITIVE_REINFORCEMENT", now, 0, intervention_id)
                cls._persist_to_db(db, student_id, intervention_id, "POSITIVE_REINFORCEMENT", 0, pre_context)
                return result
            return cls._no_action(0)

        # INACTIVE → Gentle prompt
        if state == "INACTIVE":
            result = {
                "action_required": True,
                "intervention_type": "GENTLE_PROMPT",
                "message": "It looks like you've stepped away. The lesson is paused and waiting for you whenever you're ready to continue.",
                "suggested_content": None,
                "intervention_id": intervention_id,
                "cooldown_remaining_seconds": 0,
                **pre_context
            }
            cls._record(student_id, "GENTLE_PROMPT", now, 1, intervention_id)
            cls._persist_to_db(db, student_id, intervention_id, "GENTLE_PROMPT", 1, pre_context)
            return result

        # Check if repeated quiz interventions have proven ineffective (empirical evidence)
        ineffective_quiz_count = cls._ineffective_quiz_counts.get(student_id, 0)
        trigger_attention_activity = ineffective_quiz_count >= 3

        # DISTRACTED / LOW_ENGAGEMENT / POSSIBLE_MIND_WANDERING / DISTRACTION → Escalation logic
        if state in ("DISTRACTED", "LOW_ENGAGEMENT", "POSSIBLE_MIND_WANDERING", "DISTRACTION"):
            if trigger_attention_activity:
                itype = "ATTENTION_ACTIVITY"
                message = "Let's switch it up for a moment. Ready for a quick focus challenge to bring this idea into focus?"
                suggested = None
                level = 4
            else:
                itype = "MICRO_QUIZ"
                message = "Sustained low engagement detected. A quick interactive quiz can help you re-engage with the material!"
                suggested = None
                level = 3

            result = {
                "action_required": True,
                "intervention_type": itype,
                "message": message,
                "suggested_content": suggested,
                "intervention_id": intervention_id,
                "cooldown_remaining_seconds": 0,
                **{**pre_context, "escalation_level": level}
            }
            cls._record(student_id, itype, now, level, intervention_id)
            cls._persist_to_db(db, student_id, intervention_id, itype, level, pre_context)
            return result

        # NEEDS_SUPPORT → Context-dependent escalation
        if state == "NEEDS_SUPPORT":
            if confusion >= 0.60:
                if explanation_count == 0:
                    itype = "SIMPLIFY_EXPLANATION"
                    message = "This topic seems challenging. The AI Tutor can provide a simpler explanation — click the tutor panel."
                    suggested = "Try asking the AI Tutor: 'Can you explain this in simpler terms?'"
                    level = 2
                else:
                    itype = "MICRO_QUIZ"
                    message = "Let's check your understanding with a quick quiz focused on the tricky parts."
                    suggested = None
                    level = 3
            elif recent_quiz_score is not None and recent_quiz_score < 50:
                itype = "MICRO_QUIZ"
                message = f"Your last quiz score was {int(recent_quiz_score)}%. Let's review the key concepts with a targeted quiz."
                suggested = None
                level = 3
            elif boredom >= 0.55:
                itype = "PACING_FASTER_OR_STORY"
                message = "Feeling like this is going slowly? Try jumping to the next section or ask the AI Tutor for a real-world example."
                suggested = None
                level = 2
            else:
                itype = "SIMPLIFY_EXPLANATION"
                message = "Need some help? The AI Tutor is ready to explain this topic in a different way."
                suggested = None
                level = 2

            result = {
                "action_required": True,
                "intervention_type": itype,
                "message": message,
                "suggested_content": suggested,
                "intervention_id": intervention_id,
                "cooldown_remaining_seconds": 0,
                **{**pre_context, "escalation_level": level}
            }
            cls._record(student_id, itype, now, level, intervention_id)
            cls._persist_to_db(db, student_id, intervention_id, itype, level, pre_context)
            return result

        # Fallback
        return cls._no_action(0)

    @classmethod
    def _no_action(cls, cooldown: int) -> Dict[str, Any]:
        return {
            "action_required": False,
            "intervention_type": "NONE",
            "message": "No intervention needed.",
            "suggested_content": None,
            "intervention_id": None,
            "cooldown_remaining_seconds": cooldown,
            "escalation_level": 0,
            "pre_state": "FOCUSED",
            "pre_attention": 0.0,
            "pre_confusion": 0.0,
            "pre_engagement": 0.0,
        }

    @classmethod
    def _record(cls, student_id: int, intervention_type: str, timestamp: float, level: int, intervention_id: str):
        cls._student_history.setdefault(student_id, []).append({
            "type": intervention_type,
            "time": timestamp,
            "level": level,
            "success": None,  # Unknown until outcome is reported
            "intervention_id": intervention_id,
        })

    @classmethod
    def _persist_to_db(cls, db: Optional[Session], student_id: int, intervention_id: str,
                       intervention_type: str, level: int, pre_context: Dict[str, Any]):
        """Persist intervention decision to PostgreSQL for closed-loop measurement."""
        if db is None:
            return
        try:
            from app.models.intervention_log import InterventionLog
            log = InterventionLog(
                student_id=student_id,
                intervention_id=intervention_id,
                intervention_type=intervention_type,
                escalation_level=level,
                pre_state=pre_context.get("pre_state", "FOCUSED"),
                pre_attention=pre_context.get("pre_attention"),
                pre_confusion=pre_context.get("pre_confusion"),
                pre_engagement=pre_context.get("pre_engagement"),
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to persist intervention log: {e}")
            try:
                db.rollback()
            except Exception:
                pass

    @classmethod
    def resolve_intervention(cls, db: Session, intervention_id: str,
                             post_state: str, post_attention: float,
                             post_confusion: float, post_engagement: float,
                             quiz_score: Optional[float] = None) -> bool:
        """
        Record the outcome of an intervention (MEASURE phase).
        Returns True if the intervention was successful (attention improved or confusion decreased).
        """
        try:
            from app.models.intervention_log import InterventionLog
            log = db.query(InterventionLog).filter(
                InterventionLog.intervention_id == intervention_id
            ).first()
            if not log:
                logger.warning(f"Intervention {intervention_id} not found for resolution")
                return False

            log.post_state = post_state
            log.post_attention = post_attention
            log.post_confusion = post_confusion
            log.post_engagement = post_engagement
            log.quiz_score = quiz_score
            log.resolved_at = datetime.utcnow()

            # Compute success based on objective outcome evidence
            itype = log.intervention_type or ""
            if itype == "ATTENTION_ACTIVITY":
                success = True
                cls._ineffective_quiz_counts[st_id] = 0
            elif "QUIZ" in itype:
                if quiz_score is not None:
                    # Honest mastery evaluation: score >= 50% indicates effective micro-quiz intervention
                    success = quiz_score >= 50
                else:
                    # Quiz dismissed or abandoned without submission: check if attention recovered independently
                    success = (post_attention >= 0.65) and (post_state in ("FOCUSED", "ENGAGED"))

                if not success:
                    cls._ineffective_quiz_counts[st_id] = cls._ineffective_quiz_counts.get(st_id, 0) + 1
                else:
                    cls._ineffective_quiz_counts[st_id] = 0
            else:
                pre_att = log.pre_attention or 0.0
                pre_conf = log.pre_confusion or 1.0
                success = (post_attention > pre_att + 0.05) or (post_confusion < pre_conf - 0.05) or (post_state in ("FOCUSED", "ENGAGED"))
                if not success:
                    cls._ineffective_quiz_counts[st_id] = cls._ineffective_quiz_counts.get(st_id, 0) + 1
                else:
                    cls._ineffective_quiz_counts[st_id] = 0

            log.success = success
            db.commit()


            # Update in-memory cache
            student_history = cls._student_history.get(log.student_id, [])
            for h in student_history:
                if h.get("intervention_id") == intervention_id:
                    h["success"] = success
                    break

            logger.info(f"Intervention {intervention_id} resolved: success={success}, ineffective_quizzes={cls._ineffective_quiz_counts.get(st_id, 0)}")
            return success

        except Exception as e:
            logger.error(f"Failed to resolve intervention {intervention_id}: {e}")
            try:
                db.rollback()
            except Exception:
                pass
            return False

    @classmethod
    def get_intervention_count(cls, student_id: int) -> int:
        now = time.time()
        history = cls._student_history.get(student_id, [])
        return sum(1 for h in history if now - h["time"] < ESCALATION_WINDOW_SECONDS)

    @classmethod
    def get_student_intervention_stats(cls, db: Session, student_id: int) -> Dict[str, Any]:
        """Get intervention effectiveness stats for a student (for analytics)."""
        try:
            from app.models.intervention_log import InterventionLog
            total = db.query(InterventionLog).filter(
                InterventionLog.student_id == student_id
            ).count()
            resolved = db.query(InterventionLog).filter(
                InterventionLog.student_id == student_id,
                InterventionLog.resolved_at.isnot(None)
            ).count()
            successful = db.query(InterventionLog).filter(
                InterventionLog.student_id == student_id,
                InterventionLog.success == True
            ).count()
            return {
                "total_interventions": total,
                "resolved_interventions": resolved,
                "successful_interventions": successful,
                "success_rate": round(successful / resolved * 100, 1) if resolved > 0 else None,
            }
        except Exception:
            return {"total_interventions": 0, "resolved_interventions": 0, "successful_interventions": 0, "success_rate": None}
