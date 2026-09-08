import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AffectiveAgent:
    """
    AFFECTIVE AGENT: Interprets student webcam telemetry and facial feature signals.
    Outputs numerical learner state: FOCUSED, CONFUSED, DISTRACTED, BORED, HIGH_COGNITIVE_LOAD, UNKNOWN.
    """
    @staticmethod
    def classify_state(
        attention: float = 0.85,
        confusion: float = 0.10,
        boredom: float = 0.10,
        distraction: float = 0.10,
        cognitive_load: float = 0.40,
        primary_state: str = "ENGAGED"
    ) -> str:
        # Rule-based baseline classification interface
        if confusion >= 0.60:
            return "CONFUSED"
        if distraction >= 0.65 or attention < 0.30:
            return "DISTRACTED"
        if boredom >= 0.60:
            return "BORED"
        if cognitive_load >= 0.75:
            return "HIGH_COGNITIVE_LOAD"
        if primary_state in ["ENGAGED", "FOCUSED", "OPTIMAL_ENGAGEMENT"]:
            return "FOCUSED"

        return primary_state.upper() if primary_state else "FOCUSED"
