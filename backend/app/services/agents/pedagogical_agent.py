import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class PedagogicalAgent:
    """
    PEDAGOGICAL AGENT: Chooses teaching presentation strategy based on affective state & learning history.
    Strategies: DIRECT_EXPLANATION, SIMPLIFIED_ANALOGY, STEP_BY_STEP, SOCRATIC_DIALOGUE, MICRO_QUIZ, HINT.
    """
    @staticmethod
    def select_strategy(
        affective_state: str,
        is_socratic_mode: bool = False,
        preferred_style: str = "visual"
    ) -> Dict[str, Any]:
        state_upper = (affective_state or "FOCUSED").upper()

        if is_socratic_mode:
            return {
                "strategy": "SOCRATIC_DIALOGUE",
                "complexity": "MEDIUM",
                "pacing": "GUIDED",
                "prompt_style": "Ask a guiding question rather than revealing direct answer immediately."
            }

        if state_upper == "CONFUSED":
            return {
                "strategy": "SIMPLIFIED_ANALOGY",
                "complexity": "SIMPLE",
                "pacing": "SLOW",
                "prompt_style": "Provide simple vocabulary, step-by-step breakdown, and an intuitive analogy."
            }
        elif state_upper == "HIGH_COGNITIVE_LOAD":
            return {
                "strategy": "STEP_BY_STEP",
                "complexity": "MINIMAL",
                "pacing": "ONE_CONCEPT_AT_A_TIME",
                "prompt_style": "Break response into concise numbered bullet points."
            }
        elif state_upper == "DISTRACTED":
            return {
                "strategy": "CONCISE_INTERACTIVE",
                "complexity": "DIRECT",
                "pacing": "FAST",
                "prompt_style": "Keep explanation under 3 sentences and end with a quick check-in question."
            }
        elif state_upper == "BORED":
            return {
                "strategy": "REAL_WORLD_CHALLENGE",
                "complexity": "ADVANCED",
                "pacing": "ENGAGING",
                "prompt_style": "Include an exciting practical application or challenging scenario."
            }
        else:
            return {
                "strategy": "DIRECT_EXPLANATION",
                "complexity": "STANDARD",
                "pacing": "NORMAL",
                "prompt_style": "Provide standard technical breakdown grounded in lesson material."
            }
