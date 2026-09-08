import os
import re
import math
import logging
from collections import Counter
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.course import Course, Module, RAGChunk, VideoKnowledge

logger = logging.getLogger(__name__)

class RAGService:
    """
    RAG & RETRIEVAL SERVICE:
    Provides educational content chunking, TF-IDF lexical & semantic similarity search,
    database chunk persistence (RAGChunk), and context retrieval for the AI Socratic Tutor.
    Strictly grounds answers in genuine course transcripts, descriptions, and learning materials.
    """
    _in_memory_index: List[Dict[str, Any]] = []

    @classmethod
    def chunk_text(
        cls,
        text: str,
        chunk_size: int = 120, # ~120 words per chunk for crisp topic indexing
        overlap: int = 25
    ) -> List[str]:
        if not text:
            return []
        words = text.split()
        if len(words) <= chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            start += (chunk_size - overlap)
        return chunks

    @classmethod
    def tokenize(cls, text: str) -> List[str]:
        """Simple tokenizer that lowers, removes punctuation, and filters stop words."""
        stop_words = {
            "a", "an", "the", "and", "or", "but", "if", "then", "of", "to", "in",
            "on", "at", "by", "for", "with", "about", "against", "between", "into",
            "through", "during", "before", "after", "above", "below", "from", "up",
            "down", "in", "out", "on", "off", "over", "under", "again", "further",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
            "having", "do", "does", "did", "doing", "would", "should", "could", "ought",
            "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those"
        }
        tokens = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', text.lower())
        return [t for t in tokens if t not in stop_words]

    @classmethod
    def compute_tfidf_score(cls, query_tokens: List[str], doc_tokens: List[str], all_doc_token_lists: List[List[str]]) -> float:
        """Computes TF-IDF cosine similarity between query tokens and document tokens."""
        if not query_tokens or not doc_tokens:
            return 0.0

        doc_count = len(all_doc_token_lists)
        if doc_count == 0:
            doc_count = 1

        # Term frequency in document
        doc_tf = Counter(doc_tokens)
        doc_len = len(doc_tokens)

        # Query TF
        query_tf = Counter(query_tokens)
        query_len = len(query_tokens)

        score = 0.0
        for token in set(query_tokens):
            if token in doc_tf:
                # Document frequency (how many docs have this term)
                df = sum(1 for d in all_doc_token_lists if token in d)
                idf = math.log((doc_count + 1) / (df + 1)) + 1.0

                tf_doc = doc_tf[token] / doc_len
                tf_q = query_tf[token] / query_len
                score += (tf_doc * idf) * (tf_q * idf)

        return float(score)

    @classmethod
    def index_course_content(cls, db: Session, course_id: int) -> int:
        """
        Chunks and indexes all course modules, transcripts, and video knowledge into RAGChunk table.
        """
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                return 0

            # Delete existing chunks for this course to avoid stale duplicates
            db.query(RAGChunk).filter(RAGChunk.course_id == course_id).delete()
            db.commit()

            indexed_count = 0

            # 1. Index course description and overview
            if course.description:
                course_chunks = cls.chunk_text(course.description)
                for idx, chunk in enumerate(course_chunks):
                    rag_chunk = RAGChunk(
                        course_id=course_id,
                        module_id=None,
                        chunk_text=chunk,
                        chunk_index=idx,
                        source_type="course_description",
                        metadata_json={"title": course.title, "category": course.category}
                    )
                    db.add(rag_chunk)
                    indexed_count += 1

            # 2. Index modules and transcripts
            modules = db.query(Module).filter(Module.course_id == course_id).all()
            for mod in modules:
                # Combine description and transcript
                full_mod_text = ""
                if mod.description:
                    full_mod_text += f"{mod.title}. {mod.description}\n"
                if mod.transcript:
                    full_mod_text += f"Transcript: {mod.transcript}\n"

                if full_mod_text.strip():
                    mod_chunks = cls.chunk_text(full_mod_text)
                    for idx, chunk in enumerate(mod_chunks):
                        rag_chunk = RAGChunk(
                            course_id=course_id,
                            module_id=mod.id,
                            chunk_text=chunk,
                            chunk_index=idx,
                            source_type="module_transcript" if mod.transcript else "module_description",
                            metadata_json={
                                "module_title": mod.title,
                                "module_order": mod.order,
                                "duration_minutes": mod.duration_minutes
                            }
                        )
                        db.add(rag_chunk)
                        indexed_count += 1

            # 3. Index VideoKnowledge if present
            vk_items = db.query(VideoKnowledge).filter(VideoKnowledge.course_id == course_id).all()
            for vk in vk_items:
                summary_text = f"Topic: {vk.detected_topic}. Summary: {vk.summary or ''} "
                if vk.concepts:
                    summary_text += f"Concepts: {', '.join(vk.concepts)}. "
                if vk.important_points:
                    summary_text += f"Key points: {', '.join(vk.important_points)}. "

                vk_chunks = cls.chunk_text(summary_text)
                for idx, chunk in enumerate(vk_chunks):
                    rag_chunk = RAGChunk(
                        course_id=course_id,
                        module_id=vk.module_id,
                        chunk_text=chunk,
                        chunk_index=idx,
                        source_type="video_knowledge",
                        metadata_json={"detected_topic": vk.detected_topic}
                    )
                    db.add(rag_chunk)
                    indexed_count += 1

            db.commit()
            logger.info(f"Successfully indexed {indexed_count} RAG chunks for course {course_id}")
            return indexed_count
        except Exception as e:
            logger.error(f"Error indexing course {course_id} for RAG: {e}")
            db.rollback()
            return 0

    @classmethod
    def search_course_materials(
        cls,
        course_id: int,
        query: str,
        db: Optional[Session] = None,
        module_id: Optional[int] = None,
        video_id: Optional[str] = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant chunks for the given query using TF-IDF ranking.
        Searches RAGChunk table in DB if available, falls back to in-memory or raw DB records.
        """
        if not query or not query.strip():
            return []

        query_tokens = cls.tokenize(query)
        if not query_tokens:
            return []

        results: List[Dict[str, Any]] = []

        if db:
            # 1. Query RAGChunk records
            chunks_query = db.query(RAGChunk).filter(RAGChunk.course_id == course_id)
            chunks = chunks_query.all()

            # If no chunks exist yet, auto-index course
            if not chunks:
                cls.index_course_content(db, course_id)
                chunks = db.query(RAGChunk).filter(RAGChunk.course_id == course_id).all()

            if chunks:
                # Prepare all token lists for TF-IDF calculation
                chunk_token_map = [(c, cls.tokenize(c.chunk_text)) for c in chunks]
                all_tokens = [tokens for _, tokens in chunk_token_map]

                scored_chunks = []
                for chunk_obj, doc_tokens in chunk_token_map:
                    score = cls.compute_tfidf_score(query_tokens, doc_tokens, all_tokens)
                    
                    # Boost score if chunk belongs to current active module
                    if module_id and chunk_obj.module_id == module_id:
                        score *= 1.25

                    if score > 0.001:
                        meta = chunk_obj.metadata_json or {}
                        title = meta.get("module_title") or meta.get("title") or f"Chunk #{chunk_obj.chunk_index + 1}"
                        scored_chunks.append({
                            "doc_id": f"rag_chunk_{chunk_obj.id}",
                            "title": f"Topic: {title}",
                            "snippet": chunk_obj.chunk_text,
                            "score": round(score, 4),
                            "metadata": {
                                "course_id": chunk_obj.course_id,
                                "module_id": chunk_obj.module_id,
                                "source_type": chunk_obj.source_type,
                                **meta
                            }
                        })

                scored_chunks.sort(key=lambda x: x["score"], reverse=True)
                results = scored_chunks[:top_k]

            # 2. If still no results, fallback to direct search on Course and Module
            if not results:
                results = cls._search_with_db(db, course_id, query)

        # 3. Search in-memory index if no DB results
        if not results and cls._in_memory_index:
            query_set = set(query_tokens)
            for chunk in cls._in_memory_index:
                meta = chunk.get("metadata", {})
                if course_id and meta.get("course_id") != course_id:
                    continue
                if module_id and meta.get("module_id") != module_id:
                    continue

                chunk_tokens = set(cls.tokenize(chunk["text"]))
                if query_set and chunk_tokens:
                    overlap = len(query_set.intersection(chunk_tokens))
                    if overlap > 0:
                        score = overlap / len(query_set)
                        results.append({
                            "doc_id": chunk["id"],
                            "title": f"Topic: {meta.get('topic', 'General')}",
                            "snippet": chunk["text"][:350],
                            "score": round(score, 3),
                            "metadata": meta
                        })
            results.sort(key=lambda x: x["score"], reverse=True)
            results = results[:top_k]

        return results

    @staticmethod
    def _search_with_db(db: Session, course_id: int, query: str) -> List[Dict[str, Any]]:
        results = []
        q_tokens = [w.lower() for w in query.split() if len(w) > 2]

        modules = db.query(Module).filter(Module.course_id == course_id).all()
        for mod in modules:
            text = f"{mod.title} {mod.description or ''} {mod.transcript or ''}".lower()
            if any(w in text for w in q_tokens):
                results.append({
                    "doc_id": f"module_{mod.id}",
                    "title": f"Module: {mod.title}",
                    "snippet": (mod.transcript[:300] if mod.transcript else mod.description) or mod.title,
                    "score": 0.85,
                    "metadata": {"course_id": course_id, "module_id": mod.id, "topic": mod.title, "content_type": "module_transcript"}
                })

        course = db.query(Course).filter(Course.id == course_id).first()
        if course and not results:
            results.append({
                "doc_id": f"course_{course.id}",
                "title": f"Course: {course.title}",
                "snippet": course.description or course.title,
                "score": 0.50,
                "metadata": {"course_id": course.id, "topic": course.title, "content_type": "course_description"}
            })

        return results
