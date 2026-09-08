import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class InterventionAgent:
    """
    INTERVENTION AGENT: Manages adaptive closed-loop interventions and evaluates recovery status.
    """
    @staticmethod
    def select_intervention(affective_state: str) -> Dict[str, Any]:
        state = (affective_state or "FOCUSED").upper()
        if state == "CONFUSED":
            return {
                "action_required": True,
                "intervention_type": "SIMPLIFY_EXPLANATION",
                "message": "Let's pause and simplify this key concept with an intuitive breakdown.",
                "suggested_content": "Review core algorithm step-by-step logic."
            }
        elif state in ["DISTRACTED", "BORED"]:
            return {
                "action_required": True,
                "intervention_type": "INTERACTIVE_QUIZ",
                "message": "Quick micro-check! Test your understanding on this concept.",
                "suggested_content": "Take 2-question quick checkpoint."
            }
        elif state == "HIGH_COGNITIVE_LOAD":
            return {
                "action_required": True,
                "intervention_type": "TAKE_BREAK",
                "message": "High cognitive load detected. Take a 30-second mental pause before continuing.",
                "suggested_content": "Short mental break recommendation."
            }
        
        return {
            "action_required": False,
            "intervention_type": "NONE",
            "message": "Student is in optimal learning state."
        }

    @staticmethod
    def evaluate_recovery(quiz_score_percentage: float) -> str:
        if quiz_score_percentage >= 50.0:
            return "OPTIMAL_ENGAGEMENT_RESTORED"
        return "ADDITIONAL_REVIEW_SUGGESTED"
