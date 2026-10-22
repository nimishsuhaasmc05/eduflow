import hashlib
import logging
from typing import Dict, Any, Optional, List
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

# Scoped in-memory question bank: {cache_key: List[Dict[str, Any]]}
_QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {}

def compute_question_hash(topic: str, q_text: str, options: List[Any]) -> str:
    """Generate a deterministic 12-char ID hash for a question."""
    normalized_text = (q_text or "").strip().lower()
    normalized_opts = "".join(str(o).strip().lower() for o in options)
    raw = f"{topic.lower()}_{normalized_text}_{normalized_opts}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:12]

class QuizAgent:
    """
    QUIZ AGENT: Generates state-adapted micro-quizzes strictly grounded in educational content,
    with scoped de-duplication question banking to prevent repeated questions across multiple quiz attempts.
    """

    @staticmethod
    def _build_cache_key(course_id: Optional[int], module_id: Optional[int], topic: str) -> str:
        c = course_id if course_id is not None else 0
        m = module_id if module_id is not None else 0
        t = (topic or "").strip().lower()
        return f"c{c}_m{m}_{t}"

    @classmethod
    def has_cached_quiz(
        cls,
        course_id: Optional[int],
        module_id: Optional[int],
        topic: str,
        exclude_question_ids: Optional[List[str]] = None,
        min_count: int = 3
    ) -> bool:
        cache_key = cls._build_cache_key(course_id, module_id, topic)
        if cache_key not in _QUESTION_BANK:
            return False
        bank = _QUESTION_BANK[cache_key]
        excluded = set(str(x) for x in (exclude_question_ids or []))
        available = [
            q for q in bank
            if str(q.get("question_hash", "")) not in excluded
            and str(q.get("id", "")) not in excluded
            and str(q.get("question_id", "")) not in excluded
        ]
        return len(available) >= min_count


    @classmethod
    def invalidate_cache(cls, course_id: Optional[int] = None, module_id: Optional[int] = None) -> None:
        """Clear question bank when course or module content changes."""
        global _QUESTION_BANK
        if course_id is None and module_id is None:
            _QUESTION_BANK.clear()
            return

        keys_to_delete = []
        for key in _QUESTION_BANK:
            if course_id is not None and key.startswith(f"c{course_id}_"):
                keys_to_delete.append(key)
            elif module_id is not None and f"_m{module_id}_" in key:
                keys_to_delete.append(key)

        for k in keys_to_delete:
            _QUESTION_BANK.pop(k, None)

    @classmethod
    def generate_adaptive_quiz(
        cls,
        topic: str,
        target_affect: str = "CONFUSION",
        num_questions: int = 3,
        course_id: Optional[int] = None,
        module_id: Optional[int] = None,
        context: Optional[str] = None,
        video_knowledge: Optional[Dict[str, Any]] = None,
        exclude_question_ids: Optional[List[str]] = None,
        session_index: int = 0,
        bypass_cache: bool = False
    ) -> Dict[str, Any]:
        cache_key = cls._build_cache_key(course_id, module_id, topic)
        excluded = set(str(x) for x in (exclude_question_ids or []))

        # Initialize bank if not exists
        if cache_key not in _QUESTION_BANK:
            _QUESTION_BANK[cache_key] = []

        bank = _QUESTION_BANK[cache_key]

        # Check available unseen questions in bank
        unseen_questions = [
            q for q in bank
            if str(q.get("question_hash", "")) not in excluded
            and str(q.get("id", "")) not in excluded
            and str(q.get("question_id", "")) not in excluded
        ]

        # If we need more questions, generate fresh diverse questions from AI Provider
        if len(unseen_questions) < num_questions or bypass_cache:
            provider = get_ai_provider()
            generated = provider.generate_quiz(
                topic=topic,
                target_affect=target_affect,
                num_questions=num_questions + 3,  # Generate slightly larger pool for future variety
                context=context,
                video_knowledge=video_knowledge
            )

            if generated and isinstance(generated, dict) and "questions" in generated:
                for q in generated["questions"]:
                    if isinstance(q, dict):
                        q_text = str(q.get("question") or q.get("text") or "")
                        opts = q.get("options") or []
                        q_hash = compute_question_hash(topic, q_text, opts)
                        q["question_hash"] = q_hash
                        q["question_id"] = q_hash
                        q["id"] = q_hash

                        # Add to bank if not already present
                        if not any(existing.get("question_hash") == q_hash for existing in bank):
                            bank.append(q)

        # Re-query unseen questions from bank
        unseen_questions = [
            q for q in bank
            if str(q.get("question_hash", "")) not in excluded
            and str(q.get("id", "")) not in excluded
            and str(q.get("question_id", "")) not in excluded
        ]

        # If pool is exhausted (all questions seen), recycle from oldest in bank
        selected_questions: List[Dict[str, Any]]
        if len(unseen_questions) >= num_questions:
            selected_questions = unseen_questions[:num_questions]
        else:
            # Take whatever unseen questions exist + least recently used from bank
            selected_questions = unseen_questions + [q for q in bank if q not in unseen_questions]
            selected_questions = selected_questions[:num_questions]

        # Assign stable question IDs and preserve question_hash
        formatted_questions = []
        for i, q in enumerate(selected_questions):
            q_copy = dict(q)
            q_text = str(q_copy.get("question") or q_copy.get("text") or "")
            opts = q_copy.get("options") or []
            q_hash = q_copy.get("question_hash") or compute_question_hash(topic, q_text, opts)
            q_copy["question_hash"] = q_hash
            q_copy["question_id"] = q_hash
            q_copy["id"] = q_hash
            q_copy["raw_id"] = i + 1
            formatted_questions.append(q_copy)

        return {
            "quiz_id": (session_index * 100) + 1,
            "title": f"Adaptive Knowledge Check: {topic}",
            "target_affect": target_affect,
            "questions": formatted_questions
        }
