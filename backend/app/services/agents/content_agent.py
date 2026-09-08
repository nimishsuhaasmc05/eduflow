import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.course import VideoKnowledge, Course, Module
from app.services.video_knowledge_service import VideoKnowledgeService
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

class ContentAgent:
    """
    CONTENT AGENT: Understands video/course content and retrieves grounded knowledge.
    Integrates RAGService for TF-IDF / indexed chunk retrieval from the database.
    """
    @staticmethod
    def get_grounded_content(
        db: Optional[Session],
        course_id: int,
        module_id: Optional[int],
        video_url: Optional[str],
        title: Optional[str] = None,
        description: Optional[str] = None,
        query_text: Optional[str] = None
    ) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "topic": title or "Lesson Topic",
            "subject": "Computer Science",
            "summary": "Core educational lesson content.",
            "concepts": [title or "Lesson Concept"],
            "definitions": {},
            "important_points": [],
            "procedures": [],
            "formulas": [],
            "timestamps": {},
            "confidence": 0.90,
            "rag_chunks": []
        }

        # 1. Look up VideoKnowledge
        if db and video_url:
            try:
                vk = VideoKnowledgeService.get_or_create_knowledge(
                    db=db,
                    course_id=course_id,
                    module_id=module_id,
                    video_url=video_url,
                    title=title or "Video Lesson",
                    description=description or ""
                )
                if vk:
                    result.update({
                        "topic": vk.detected_topic or vk.topic or title or "Video Lesson Topic",
                        "subject": vk.subject or "Computer Science",
                        "summary": vk.summary or "",
                        "concepts": vk.concepts or [],
                        "definitions": vk.definitions or {},
                        "important_points": vk.important_points or [],
                        "procedures": vk.procedures or [],
                        "formulas": vk.formulas or [],
                        "timestamps": vk.timestamps or {},
                        "confidence": vk.confidence or 0.95
                    })
            except Exception as e:
                logger.warning(f"ContentAgent video knowledge lookup error: {e}")

        # 2. Retrieve relevant course chunks using RAGService
        if query_text and db and course_id:
            try:
                retrieved_chunks = RAGService.search_course_materials(
                    course_id=course_id,
                    query=query_text,
                    db=db,
                    module_id=module_id,
                    top_k=3
                )
                result["rag_chunks"] = retrieved_chunks
                if retrieved_chunks:
                    chunk_snippets = [c.get("snippet", "") for c in retrieved_chunks if c.get("snippet")]
                    if chunk_snippets and not result.get("summary"):
                        result["summary"] = "\n".join(chunk_snippets[:2])
            except Exception as e:
                logger.warning(f"ContentAgent RAG retrieval error: {e}")

        return result
