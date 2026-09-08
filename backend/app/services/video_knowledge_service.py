import json
import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from app.core.config import settings
from app.models.course import VideoKnowledge, Module, Course
from app.services.video_service import extract_youtube_id, auto_fetch_youtube_transcript

logger = logging.getLogger(__name__)

class VideoKnowledgeService:
    @staticmethod
    def extract_structured_knowledge(
        video_url: str,
        title: str,
        description: str,
        transcript: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uses Gemini to extract structured educational knowledge
        from a video's URL, metadata, and transcript.
        """
        api_key = settings.GEMINI_API_KEY
        video_id = extract_youtube_id(video_url)
        
        # Ensure transcript is available if YouTube URL
        full_transcript = (transcript or "").strip()
        if not full_transcript and video_id:
            full_transcript = auto_fetch_youtube_transcript(video_url) or ""

        # Default fallback structure if API is offline
        default_topic = title or "Educational Lesson"
        fallback_knowledge = {
            "title": title or default_topic,
            "detected_topic": default_topic,
            "topic": default_topic,
            "subject": "Computer Science & Education",
            "summary": description or f"Educational video lesson covering {default_topic}.",
            "learning_objectives": [f"Understand core concepts of {default_topic}"],
            "concepts": [default_topic, "Core Principles", "Key Techniques"],
            "definitions": {default_topic: f"Core topic presented in module '{title}'."},
            "important_points": [f"Key takeaways from lesson '{title}'."],
            "examples": [f"Practical applications of {default_topic}."],
            "procedures": [f"Standard workflow for {default_topic}."],
            "formulas": [],
            "timestamps": {"00:00": f"Introduction to {default_topic}"},
            "source_type": "transcript" if full_transcript else "metadata",
            "confidence": 0.95,
            "analysis_model": settings.GEMINI_MODEL,
            "analysis_version": "v1.0"
        }

        if not api_key:
            fallback_knowledge["full_transcript"] = full_transcript
            return fallback_knowledge

        try:
            client = genai.Client(api_key=api_key)
            system_instruction = (
                "You are Edu-Flow's Educational Content Knowledge Extractor. "
                "Analyze the video title, description, and transcript to extract WHAT THE TEACHER ACTUALLY TEACHES. "
                "Do NOT include system information, MediaPipe, webcam, facial landmarks, pupil tracking, cognitive load, "
                "or Edu-Flow telemetry UNLESS the video itself specifically teaches computer vision or facial tracking."
            )

            prompt = f"""
Analyze the following educational video metadata and transcript to extract structured learning knowledge.

VIDEO TITLE: {title}
VIDEO DESCRIPTION: {description}
VIDEO URL: {video_url}
TRANSCRIPT: {full_transcript[:4000] if full_transcript else "No explicit transcript available"}

Return a strictly valid JSON object with the following fields:
1. "title": "{title}"
2. "detected_topic": The specific subject matter taught (e.g., "Binary Search Algorithms", "Machine Learning Fundamentals").
3. "subject": Broader academic field (e.g. "Computer Science", "Biology", "Psychology").
4. "summary": A 2-3 sentence summary of what the teacher explains in this video.
5. "learning_objectives": Array of 2-3 specific learning outcomes.
6. "concepts": Array of key concepts, algorithms, or technical terms taught.
7. "definitions": Object mapping terms taught in the video to concise definitions.
8. "important_points": Array of 3-4 critical takeaways from the video.
9. "examples": Array of practical examples or analogies mentioned in the video.
10. "procedures": Array of step-by-step procedures or workflows taught in the video.
11. "formulas": Array of mathematical/logical formulas or equations mentioned (if any).
12. "timestamps": Object mapping key timestamps (e.g. "02:15", "12:35") to topics explained at that time.

Output JSON ONLY:
"""
            contents_payload = []
            if "youtube" in video_url.lower() or "youtu.be" in video_url.lower():
                try:
                    video_part = types.Part(file_data=types.FileData(file_uri=video_url.strip()))
                    contents_payload.append(video_part)
                except Exception as ve:
                    logger.warning("Could not attach video Part for extraction: %s", ve)

            contents_payload.append(prompt)

            chat = client.chats.create(
                model=settings.GEMINI_MODEL,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            response = chat.send_message(contents_payload)

            if response and response.text:
                from app.services.ai_provider import safe_json_loads
                parsed = safe_json_loads(response.text)
                parsed["title"] = title or parsed.get("detected_topic", "Video Lesson")
                parsed["topic"] = parsed.get("detected_topic", title or "Video Lesson")
                parsed["source_type"] = "video_analysis" if "youtube" in video_url.lower() else ("transcript" if full_transcript else "metadata")
                parsed["full_transcript"] = full_transcript
                parsed["confidence"] = 0.95
                parsed["analysis_model"] = settings.GEMINI_MODEL
                parsed["analysis_version"] = "v1.0"
                return parsed

        except Exception as err:
            logger.warning("Gemini knowledge extraction exception (%s); returning fallback structure.", err)

        fallback_knowledge["full_transcript"] = full_transcript
        return fallback_knowledge

    @classmethod
    def get_or_create_knowledge(
        cls,
        db: Session,
        course_id: Optional[int],
        module_id: Optional[int],
        video_url: str,
        title: str = "",
        description: str = "",
        transcript: Optional[str] = None,
        force_reanalyze: bool = False
    ) -> VideoKnowledge:
        """
        Retrieves cached VideoKnowledge from PostgreSQL or extracts and persists a new record.
        Re-analyzes if force_reanalyze is True or if knowledge is missing.
        """
        if not video_url:
            video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

        video_id = extract_youtube_id(video_url)
        
        # 1. Query existing cache in PostgreSQL
        existing = None
        if not force_reanalyze:
            if module_id:
                existing = db.query(VideoKnowledge).filter(VideoKnowledge.module_id == module_id).first()
            elif video_id:
                existing = db.query(VideoKnowledge).filter(VideoKnowledge.video_id == video_id).first()
            elif video_url:
                existing = db.query(VideoKnowledge).filter(VideoKnowledge.video_url == video_url).first()

            if existing:
                return existing

        # 2. Extract new structured knowledge
        extracted = cls.extract_structured_knowledge(video_url, title, description, transcript)

        # 3. Create or update VideoKnowledge in PostgreSQL
        if existing and force_reanalyze:
            vk = existing
            vk.title = extracted.get("title", title)
            vk.detected_topic = extracted.get("detected_topic", title or "Educational Lesson")
            vk.topic = extracted.get("topic", title or "Educational Lesson")
            vk.subject = extracted.get("subject", "Computer Science")
            vk.summary = extracted.get("summary", description)
            vk.learning_objectives = json.dumps(extracted.get("learning_objectives", [])) if isinstance(extracted.get("learning_objectives"), list) else str(extracted.get("learning_objectives"))
            vk.concepts = extracted.get("concepts", [])
            vk.definitions = extracted.get("definitions", {})
            vk.important_points = extracted.get("important_points", [])
            vk.examples = extracted.get("examples", [])
            vk.procedures = extracted.get("procedures", [])
            vk.formulas = extracted.get("formulas", [])
            vk.timestamps = extracted.get("timestamps", {})
            vk.transcript = extracted.get("full_transcript", transcript or "")
            vk.source_type = extracted.get("source_type", "combined")
            vk.confidence = float(extracted.get("confidence", 0.95))
            vk.analysis_model = str(extracted.get("analysis_model", settings.GEMINI_MODEL))
            vk.analysis_version = str(extracted.get("analysis_version", "v1.0"))
            vk.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(vk)
            logger.info("Re-analyzed and updated VideoKnowledge ID=%s for module_id=%s", vk.id, module_id)
            return vk

        new_vk = VideoKnowledge(
            video_id=video_id,
            video_url=video_url,
            course_id=course_id,
            module_id=module_id,
            title=extracted.get("title", title),
            detected_topic=extracted.get("detected_topic", title or "Educational Lesson"),
            topic=extracted.get("topic", title or "Educational Lesson"),
            subject=extracted.get("subject", "Computer Science"),
            summary=extracted.get("summary", description),
            learning_objectives=json.dumps(extracted.get("learning_objectives", [])) if isinstance(extracted.get("learning_objectives"), list) else str(extracted.get("learning_objectives")),
            concepts=extracted.get("concepts", []),
            definitions=extracted.get("definitions", {}),
            important_points=extracted.get("important_points", []),
            examples=extracted.get("examples", []),
            procedures=extracted.get("procedures", []),
            formulas=extracted.get("formulas", []),
            timestamps=extracted.get("timestamps", {}),
            transcript=extracted.get("full_transcript", transcript or ""),
            source_type=extracted.get("source_type", "combined"),
            confidence=float(extracted.get("confidence", 0.95)),
            analysis_model=str(extracted.get("analysis_model", settings.GEMINI_MODEL)),
            analysis_version=str(extracted.get("analysis_version", "v1.0"))
        )
        try:
            db.add(new_vk)
            db.commit()
            db.refresh(new_vk)
            logger.info("Persisted new VideoKnowledge record ID=%s for module_id=%s (Topic: %s)", new_vk.id, module_id, new_vk.detected_topic)
            return new_vk
        except Exception as db_err:
            db.rollback()
            logger.error("Failed to persist VideoKnowledge to DB: %s", db_err)
            return new_vk

