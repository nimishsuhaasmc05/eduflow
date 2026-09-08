import logging
from typing import Dict, Any, Optional
from app.schemas.ai import AITutorQuery, AITutorResponse
from app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

class TutorAgent:
    """
    TUTOR AGENT: Answers student questions strictly grounded in course & video content.
    Uses RAG retrieval context and Socratic pedagogical strategies powered by Gemini.
    """
    @staticmethod
    def generate_response(
        query: AITutorQuery,
        knowledge_context: Dict[str, Any],
        pedagogical_strategy: Dict[str, Any]
    ) -> AITutorResponse:
        provider = get_ai_provider()
        user_q = (query.question or query.query or "").strip()
        topic = knowledge_context.get("topic", query.video_topic or query.module_title or "Lesson Topic")
        module_title = query.module_title or "Module"
        is_socratic = (query.mode or "").lower() == "socratic" or pedagogical_strategy.get("is_socratic_mode", False)

        # Extract RAG chunks
        rag_chunks = knowledge_context.get("rag_chunks", [])
        rag_text_snippets = []
        sources = [f"Module: {module_title}"]
        for c in rag_chunks:
            snippet = c.get("snippet", "").strip()
            title = c.get("title", "")
            if snippet:
                rag_text_snippets.append(f"[{title}]: {snippet}")
            if title and title not in sources:
                sources.append(title)

        rag_context_str = "\n\n".join(rag_text_snippets) if rag_text_snippets else "No specific text chunks indexed."

        # Grounding check: does concept exist in knowledge context or RAG chunks?
        concepts = knowledge_context.get("concepts", [])
        query_lower = user_q.lower()
        is_grounded = bool(rag_chunks) or any(c.lower() in query_lower for c in concepts) or not user_q
        grounding_type = "COURSE_GROUNDED" if is_grounded else "GENERAL_KNOWLEDGE"

        if is_socratic:
            system_instruction = (
                "You are EduFlow's AI Socratic Tutor powered by Gemini. "
                "Your objective is to guide the student towards understanding by asking thought-provoking questions, "
                "giving hints, breaking complex concepts down into intuitive steps, and checking their understanding. "
                "Ground your answers directly in the retrieved course content below. "
                "Never invent facts not present in course materials."
            )
        else:
            system_instruction = (
                "You are EduFlow's Context-Aware AI Tutor powered by Gemini. "
                "Rule 1: Answer the student's question clearly, accurately, and directly using the course materials provided. "
                "Rule 2: Do NOT mention camera telemetry or biometric monitoring. "
                "Rule 3: Adapt presentation style to pedagogical strategy: " + str(pedagogical_strategy.get('prompt_style', 'Clear and engaging.'))
            )

        prompt = f"""
STUDENT QUESTION: {user_q}
CURRENT COURSE / MODULE: {module_title}
TOPIC: {topic}

RETRIEVED COURSE CONTENT (RAG):
{rag_context_str}

COURSE KNOWLEDGE SUMMARY:
{knowledge_context.get('summary', '')}

PEDAGOGICAL MODE: {'Socratic Guidance & Hints' if is_socratic else 'Direct Concept Explanation'}
"""

        raw_resp = provider.generate_answer(
            prompt=prompt,
            system_instruction=system_instruction,
            detected_topic=topic
        )

        answer_text = raw_resp.get("answer", "")
        if not answer_text or not str(answer_text).strip():
            parts = []
            if raw_resp.get("introduction"):
                parts.append(str(raw_resp["introduction"]))
            if raw_resp.get("initial_question"):
                parts.append(f"**Guiding Question:** {raw_resp['initial_question']}")
            
            steps = raw_resp.get("step_by_step_guide") or raw_resp.get("steps")
            if isinstance(steps, list):
                parts.append("**Step-by-Step Breakdown:**")
                for s in steps:
                    if isinstance(s, dict):
                        action = s.get("action") or s.get("title") or f"Step {s.get('step', '')}"
                        explanation = s.get("explanation", "")
                        prompt_q = s.get("thought_prompt") or s.get("question", "")
                        step_str = f"- **{action}**: {explanation}"
                        if prompt_q:
                            step_str += f"\n  *Reflection:* {prompt_q}"
                        parts.append(step_str)
                    else:
                        parts.append(f"- {s}")
            elif raw_resp.get("explanation"):
                parts.append(str(raw_resp["explanation"]))

            followup_q = raw_resp.get("follow_up_question") or raw_resp.get("socratic_question")
            if followup_q:
                parts.append(f"**Think About This:** {followup_q}")

            if parts:
                answer_text = "\n\n".join(parts)
            else:
                answer_text = f"In **{topic}**, here is how this concept applies step-by-step:\n\n1. **Core Concept**: {topic} structures procedures into systematic computational rules.\n2. **Reasoning**: Analyze input constraints and identify invariant properties.\n3. **Application**: Apply the algorithm and verify termination conditions."

        # Append guiding hint or thought question if provided separately
        if raw_resp.get("socratic_question") and raw_resp["socratic_question"] not in answer_text:
            answer_text += f"\n\n**Think About This:** {raw_resp['socratic_question']}"
        elif raw_resp.get("hint") and raw_resp["hint"] not in answer_text:
            answer_text += f"\n\n**Hint:** {raw_resp['hint']}"

        if not is_grounded and not rag_chunks and not answer_text.lower().startswith("i couldn't find"):
            answer_text = f"I couldn't find '{user_q}' directly in the current course materials for '{module_title}'. Based on foundational educational principles:\n\n{answer_text}"

        return AITutorResponse(
            answer=answer_text,
            simplified_explanation=raw_resp.get("simplified_explanation") or f"Core concept breakdown for {topic}.",
            analogies=raw_resp.get("analogies", [f"Think of {topic} as a logical blueprint that guides problem solving."]),
            visual_diagram_mermaid=raw_resp.get("visual_diagram_mermaid"),
            suggested_followups=raw_resp.get("suggested_followups", [
                f"How does {topic} perform with large inputs?",
                f"Can you give a practical code example for {topic}?",
                "Can you test my understanding with a quick question?"
            ]),
            sources=sources,
            grounding_type=grounding_type,
            timestamp_reference=raw_resp.get("timestamp_reference"),
            timestamp_seconds=raw_resp.get("timestamp_seconds")
        )
