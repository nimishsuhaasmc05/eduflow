import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.schemas.ai import QuizGenerationRequest
from app.services.agents.quiz_agent import QuizAgent
from app.models.course import VideoKnowledge, Module, Course
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

# Scoped cache for retrieved video context & knowledge: {cache_key: (context_str, video_knowledge_dict)}
_CONTEXT_CACHE: Dict[str, Any] = {}

class DynamicQuizGenerator:
    @staticmethod
    def generate_adaptive_quiz(req: QuizGenerationRequest, db: Optional[Session] = None) -> Dict[str, Any]:
        target_topic = req.topic or "Introduction to Algorithms"

        # FAST PATH: If 3-question grounded quiz is already in QuizAgent cache, serve immediately (0ms DB latency)
        if QuizAgent.has_cached_quiz(req.course_id, req.module_id, target_topic, exclude_question_ids=req.exclude_question_ids):
            return QuizAgent.generate_adaptive_quiz(
                topic=target_topic,
                target_affect=req.target_affect or "CONFUSION",
                num_questions=req.num_questions or 3,
                course_id=req.course_id,
                module_id=req.module_id,
                exclude_question_ids=req.exclude_question_ids,
                session_index=req.session_index or 0
            )

        context_key = f"c{req.course_id or 0}_m{req.module_id or 0}_{target_topic.strip().lower()}"
        context_str: Optional[str] = None
        video_knowledge_dict: Optional[Dict[str, Any]] = None

        # Check in-memory context cache before querying PostgreSQL
        if context_key in _CONTEXT_CACHE:
            context_str, video_knowledge_dict = _CONTEXT_CACHE[context_key]
        elif db and (req.module_id or req.course_id):
            try:
                # 1. Check if structured VideoKnowledge exists for module
                if req.module_id:
                    vk = db.query(VideoKnowledge).filter(VideoKnowledge.module_id == req.module_id).first()
                    if vk:
                        video_knowledge_dict = {
                            "summary": vk.summary,
                            "concepts": vk.concepts or [],
                            "definitions": vk.definitions or {},
                            "important_points": vk.important_points or [],
                            "timestamps": vk.timestamps or {}
                        }
                    else:
                        mod = db.query(Module).filter(Module.id == req.module_id).first()
                        if mod:
                            context_str = f"Module: {mod.title}\nDescription: {mod.description}"

                # 2. Augment with RAG retrieval if available
                if req.course_id:
                    rag_results = RAGService.search_course_materials(
                        course_id=req.course_id,
                        query=target_topic,
                        db=db,
                        module_id=req.module_id,
                        top_k=2
                    )
                    if rag_results:
                        rag_text = "\n".join(r.get("snippet", "") for r in rag_results if r.get("snippet"))
                        if rag_text.strip():
                            context_str = f"{context_str}\n{rag_text}" if context_str else rag_text

                # Store retrieved context in memory cache
                _CONTEXT_CACHE[context_key] = (context_str, video_knowledge_dict)

            except Exception as e:
                logger.warning(f"[DynamicQuizGenerator] Context retrieval note: {e}")

        # If transcript explicitly provided in request
        if req.transcript:
            context_str = f"{context_str}\nTranscript: {req.transcript}" if context_str else req.transcript

        return QuizAgent.generate_adaptive_quiz(
            topic=target_topic,
            target_affect=req.target_affect or "CONFUSION",
            num_questions=req.num_questions or 3,
            course_id=req.course_id,
            module_id=req.module_id,
            context=context_str,
            video_knowledge=video_knowledge_dict,
            exclude_question_ids=req.exclude_question_ids,
            session_index=req.session_index or 0
        )
