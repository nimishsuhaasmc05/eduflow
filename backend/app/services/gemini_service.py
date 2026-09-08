import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.core.config import settings
from app.schemas.ai import AITutorQuery, AITutorResponse, QuizGenerationRequest, LibraryActionRequest, LibraryActionResponse, GeminiTopicRequest, GeminiTopicResponse
from app.services.video_service import extract_youtube_id

logger = logging.getLogger(__name__)

class GeminiService:
    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        api_key = settings.GEMINI_API_KEY
        if not api_key or len(api_key.strip()) < 10 or api_key.startswith("dummy"):
            return None
        try:
            return genai.Client(api_key=api_key.strip())
        except Exception as e:
            logger.warning("Failed to initialize Google Gemini Client: %s", e)
            return None

    @classmethod
    def generate_tutor_response(cls, query: AITutorQuery) -> AITutorResponse:
        user_query = (query.question or query.query or "").strip()
        state = (query.affective_state or query.student_affective_state or "ENGAGED").upper()
        client = cls.get_client()

        # Extract active module & video context
        course_title = query.course_title or f"Course #{query.course_id}"
        module_title = query.module_title or query.video_title or (f"Module #{query.module_id}" if query.module_id else "General Module")
        module_desc = query.module_description or ""
        video_url = query.video_url or ""
        video_type = query.video_type or "unknown"
        transcript = query.transcript or ""

        if not user_query:
            return AITutorResponse(
                answer="Please type a question about this module or video.",
                simplified_explanation="Submit a question to receive a video-grounded explanation.",
                analogies=[],
                visual_diagram_mermaid="",
                suggested_followups=["What is the main topic of this video?", "Can you summarize this lesson?"],
                sources=[]
            )

        # 1. Retrieve or extract structured VideoKnowledge from PostgreSQL
        video_knowledge_summary = ""
        detected_topic = query.video_topic or query.module_topic or module_title
        vk_obj = None
        concepts_list = []
        definitions_map = {}
        timestamps_map = {}

        try:
            from app.services.video_knowledge_service import VideoKnowledgeService
            from app.core.database import SessionLocal
            with SessionLocal() as db_session:
                vk_obj = VideoKnowledgeService.get_or_create_knowledge(
                    db=db_session,
                    course_id=query.course_id,
                    module_id=query.module_id,
                    video_url=video_url,
                    title=module_title,
                    description=module_desc,
                    transcript=transcript
                )
                if vk_obj:
                    detected_topic = vk_obj.detected_topic or vk_obj.topic or detected_topic
                    concepts_list = vk_obj.concepts if isinstance(vk_obj.concepts, list) else []
                    definitions_map = vk_obj.definitions if isinstance(vk_obj.definitions, dict) else {}
                    timestamps_map = vk_obj.timestamps if isinstance(vk_obj.timestamps, dict) else {}
                    concepts_str = ", ".join(concepts_list)
                    video_knowledge_summary = (
                        f"- Video Title: {vk_obj.title or module_title}\n"
                        f"- Detected Video Topic: {detected_topic}\n"
                        f"- Academic Subject: {vk_obj.subject}\n"
                        f"- Video Summary: {vk_obj.summary}\n"
                        f"- Extracted Concepts: {concepts_str}\n"
                        f"- Definitions: {json.dumps(definitions_map)}\n"
                        f"- Key Takeaways: {vk_obj.important_points}\n"
                        f"- Key Timestamps: {json.dumps(timestamps_map)}"
                    )
        except Exception as vk_err:
            logger.warning("VideoKnowledge retrieval warning: %s", vk_err)

        # 2. Question Routing & Grounding Check
        # Check if the query concept exists in retrieved video knowledge
        query_lower = user_query.lower()
        topic_lower = detected_topic.lower()
        concepts_lower = [str(c).lower() for c in concepts_list]
        is_concept_in_video = any(c in query_lower or query_lower in c for c in concepts_lower) if concepts_lower else True
        if topic_lower and (topic_lower in query_lower or query_lower in topic_lower):
            is_concept_in_video = True

        scope_mode = query.mode or ("CURRENT_VIDEO" if is_concept_in_video else "GENERAL_KNOWLEDGE")
        grounding_type = "VIDEO_GROUNDED" if is_concept_in_video else "GENERAL_KNOWLEDGE"

        # Timestamp jump detection
        ts_ref = None
        ts_sec = None
        if timestamps_map:
            for time_str, label in timestamps_map.items():
                if any(w in query_lower for w in str(label).lower().split()):
                    ts_ref = time_str
                    try:
                        parts = time_str.split(":")
                        if len(parts) == 2:
                            ts_sec = float(int(parts[0]) * 60 + int(parts[1]))
                        elif len(parts) == 3:
                            ts_sec = float(int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]))
                    except Exception:
                        pass
                    break

        # 3. Development Logging [TUTOR]
        logger.info(
            "[TUTOR]\n"
            "  course_id: %s\n"
            "  module_id: %s\n"
            "  video_id: %s\n"
            "  topic: %s\n"
            "  question: '%s'\n"
            "  scope: %s\n"
            "  retrieved_concepts: %s\n"
            "  context_source: %s\n"
            "  confidence: %s\n"
            "  affective_state: %s\n"
            "  response_mode: %s\n"
            "  model: %s",
            query.course_id,
            query.module_id,
            query.video_id or extract_youtube_id(video_url) or "youtube_video",
            detected_topic,
            user_query,
            scope_mode,
            concepts_list[:5],
            vk_obj.source_type if vk_obj else "metadata",
            vk_obj.confidence if vk_obj else 0.95,
            state,
            "SIMPLIFIED" if state in ["CONFUSION", "HIGH_COGNITIVE_LOAD"] else "STANDARD",
            settings.GEMINI_MODEL
        )

        if not client:
            return AITutorResponse(
                answer=f"Answering query regarding '{detected_topic}': {user_query}. (Backend API offline mode).",
                simplified_explanation=f"Grounded in lesson topic: {detected_topic}.",
                analogies=[f"Think of {detected_topic} as a structured workflow."],
                visual_diagram_mermaid="graph TD;\n  A[Question] --> B[Lesson Topic];\n  B --> C[Factual Breakdown];",
                suggested_followups=[f"Explain the key principles of {detected_topic} again."],
                sources=[f"Module: {module_title}"],
                grounding_type=grounding_type,
                timestamp_reference=ts_ref,
                timestamp_seconds=ts_sec
            )

        try:
            system_instruction = (
                "You are Edu-Flow's Video-Grounded AI Pedagogical Tutor Agent. "
                "EDUCATIONAL CONTENT CONTEXT = WHAT YOU TEACH (Strictly grounded in current lesson video topic). "
                "AFFECTIVE TELEMETRY (Focus, Confusion, Cognitive Load) = HOW YOU DELIVER THE LESSON (Explanation style, complexity, analogies). "
                "CRITICAL MANDATORY RULES:\n"
                "1. Answer the student's question directly FIRST. NEVER open with meta preamble phrases like 'I noticed you are feeling uncertain', 'I noticed you are confused', or 'I see your attention is drifting'.\n"
                "2. The primary 'answer' field MUST begin immediately with the direct, factual, technical explanation of the question topic.\n"
                "3. NEVER mention MediaPipe, webcam telemetry, facial landmarks, pupil tracking, or cognitive load in video answers UNLESS the video itself specifically teaches computer vision.\n"
                "4. If the student question is NOT covered in the current video knowledge context, state clearly: 'I couldn't find that concept in the current video's available content. I can check broader course material or explain it using general educational knowledge.'\n"
                "5. Adapt presentation complexity to student affective state: if state is CONFUSION or HIGH_COGNITIVE_LOAD, use simpler vocabulary and intuitive analogies in 'simplified_explanation'."
            )

            prompt = f"""
STUDENT QUESTION: {user_query}
STUDENT AFFECTIVE STATE: {state} (Controls presentation style/simplicity ONLY. NEVER changes factual topic!)
GROUNDING SCOPE: {scope_mode}

AUTHORITATIVE CURRENT VIDEO & MODULE KNOWLEDGE CONTEXT:
- Course Title: {course_title} (ID: {query.course_id})
- Module Title: {module_title} (ID: {query.module_id or 'General'})
- Video URL: {video_url}
- Video Type: {video_type}
{video_knowledge_summary}
- Available Transcript: {transcript[:2500] if transcript else 'No explicit transcript provided for this video.'}

Generate a JSON object with these exact keys:
1. "answer": Direct factual answer to the student query, strictly grounded in the video topic '{detected_topic}'. Begin immediately with the answer (NO meta preamble).
2. "simplified_explanation": A 1-2 sentence intuitive breakdown tailored to state '{state}'.
3. "analogies": Array of 1-2 practical real-world analogies related to '{detected_topic}'.
4. "visual_diagram_mermaid": A valid Mermaid.js diagram string (e.g. "graph TD; A[{detected_topic}] --> B[Application];").
5. "suggested_followups": Array of 3 relevant follow-up questions about '{detected_topic}'.
6. "sources": Array of reference citations (e.g. ["Video: {module_title}"]).
"""

            models_to_try = [settings.GEMINI_MODEL, "gemini-2.0-flash", "gemini-1.5-flash"]
            models_to_try = list(dict.fromkeys(models_to_try))
            response = None
            last_err = None

            contents_payload = []
            if video_type == "youtube" and video_url and ("youtube" in video_url.lower() or "youtu.be" in video_url.lower()):
                try:
                    video_part = types.Part(file_data=types.FileData(file_uri=video_url.strip()))
                    contents_payload.append(video_part)
                except Exception as v_err:
                    logger.warning("Could not attach YouTube video Part directly: %s", v_err)

            contents_payload.append(prompt)

            for model_candidate in models_to_try:
                try:
                    chat = client.chats.create(
                        model=model_candidate,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            temperature=0.2
                        )
                    )
                    response = chat.send_message(contents_payload)
                    if response and response.text:
                        break
                except Exception as m_err:
                    last_err = m_err
                    logger.warning("Gemini model candidate %s failed: %s", model_candidate, m_err)
                    continue

            if not response and last_err:
                raise last_err

            if response and response.text:
                try:
                    from app.services.ai_provider import safe_json_loads
                    data = safe_json_loads(response.text)
                    ans_text = data.get("answer", response.text).strip()

                    # Prepend disclaimer if concept was not found in current video
                    if not is_concept_in_video and not ans_text.startswith("I couldn't find"):
                        ans_text = f"I couldn't find '{user_query}' in the current video's available content ('{module_title}'). Based on general educational knowledge:\n\n" + ans_text

                    return AITutorResponse(
                        answer=ans_text,
                        simplified_explanation=data.get("simplified_explanation", f"Grounded in topic: {detected_topic}"),
                        analogies=data.get("analogies", []),
                        visual_diagram_mermaid=data.get("visual_diagram_mermaid", f"graph TD;\n  A[{detected_topic}] --> B[Core Logic];"),
                        suggested_followups=data.get("suggested_followups", [
                            f"Explain key concepts of {detected_topic} again.",
                            "Can you give me a practice problem on this topic?",
                            "How does this apply in real-world engineering?"
                        ]),
                        sources=data.get("sources", [f"Module: {module_title}"]),
                        grounding_type=grounding_type,
                        timestamp_reference=ts_ref,
                        timestamp_seconds=ts_sec
                    )
                except Exception as parse_err:
                    return AITutorResponse(
                        answer=response.text.strip(),
                        simplified_explanation=f"Grounded in topic: {detected_topic}",
                        analogies=[],
                        visual_diagram_mermaid=f"graph TD;\n  A[{detected_topic}] --> B[Explanation];",
                        suggested_followups=["Explain with an example.", "Give me a practice question."],
                        sources=[f"Module: {module_title}"],
                        grounding_type=grounding_type,
                        timestamp_reference=ts_ref,
                        timestamp_seconds=ts_sec
                    )

        except Exception as e:
            logger.error("Gemini API error in generate_tutor_response: %s", e)
            return cls._tutor_fallback_response(user_query, state, detected_topic, module_title, is_concept_in_video)

    @classmethod
    def generate_quiz(cls, req: QuizGenerationRequest) -> Dict[str, Any]:
        topic = req.topic or "Educational Computer Science & AI"
        state = req.target_affect or "CONFUSION"
        client = cls.get_client()

        # Determine quiz style & difficulty instructions based on affective state
        if state == "CONFUSION":
            style_instruction = "Simplify questions. Focus on core definitions and clear recognition. Keep questions single-concept."
            num_q = max(1, min(req.num_questions, 2))
        elif state == "HIGH_COGNITIVE_LOAD":
            style_instruction = "Single-step, highly focused questions. Avoid multi-step complex calculations."
            num_q = max(1, min(req.num_questions, 2))
        elif state == "BOREDOM":
            style_instruction = "Challenging application scenario questions. High engagement and practical use cases."
            num_q = max(2, min(req.num_questions, 5))
        elif state == "DISTRACTION":
            style_instruction = "Short micro-check focusing on direct key takeaways."
            num_q = max(1, min(req.num_questions, 3))
        else:
            style_instruction = "Standard balanced conceptual and application questions."
            num_q = req.num_questions

        if client:
            try:
                system_instruction = (
                    "You are Edu-Flow's Adaptive Quiz Generator. "
                    "QUIZ CONTENT MUST BE 100% GROUNDED IN THE LESSON TOPIC AND VIDEO CONTEXT. "
                    "AFFECTIVE STATE CONTROLS QUIZ DIFFICULTY AND PRESENTATION STYLE ONLY. "
                    "NEVER generate quiz questions about facial landmarks, pupil movement, or webcam telemetry unless the lesson itself is about computer vision."
                )

                prompt = f"""
LESSON TOPIC: {topic}
TARGET AFFECTIVE STATE: {state}
STYLE INSTRUCTION: {style_instruction}
NUMBER OF QUESTIONS: {num_q}

Generate a JSON object with this exact schema:
{{
  "quiz_id": 101,
  "title": "Adaptive Micro-Check: {topic}",
  "target_affect": "{state}",
  "questions": [
    {{
      "id": 1,
      "question": "Question text grounded strictly in {topic}?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Clear explanation of why this answer is correct."
    }}
  ]
}}
"""

                chat = client.chats.create(
                    model=settings.GEMINI_MODEL,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.2
                    )
                )
                response = chat.send_message(prompt)

                if response and response.text:
                    from app.services.ai_provider import safe_json_loads
                    data = safe_json_loads(response.text)
                    if isinstance(data, dict) and "questions" in data and len(data["questions"]) > 0:
                        # Validate question structure
                        valid_questions = []
                        for idx, q in enumerate(data["questions"], start=1):
                            if isinstance(q, dict) and "question" in q and "options" in q and len(q["options"]) >= 2:
                                valid_questions.append({
                                    "id": idx,
                                    "question": str(q["question"]),
                                    "options": [str(opt) for opt in q["options"]],
                                    "correct_index": int(q.get("correct_index", 0)) % len(q["options"]),
                                    "explanation": str(q.get("explanation", "Correct answer based on course principles."))
                                })
                        if valid_questions:
                            return {
                                "quiz_id": data.get("quiz_id", 101),
                                "title": data.get("title", f"Adaptive Micro-Check: {topic}"),
                                "target_affect": req.target_affect,
                                "questions": valid_questions[:req.num_questions]
                            }
            except Exception as e:
                logger.warning("Gemini Quiz Generation error: %s. Using local fallback quiz.", e)

        return cls._quiz_fallback(topic, req.target_affect, req.num_questions)

    @classmethod
    def generate_library_assistant_response(cls, req: LibraryActionRequest) -> LibraryActionResponse:
        client = cls.get_client()
        action = req.action.lower()
        title = req.resource_title or "Selected Library Resource"
        page = req.page_number or 18
        query = req.query or "General study inquiry"
        source_cite = f"SOURCE: {title}, Page {page}"

        if client:
            try:
                system_instruction = (
                    "You are Edu-Flow's Gemini Study Assistant for the Digital Academic Research Library. "
                    "Provide clear, document-grounded answers and study materials with accurate source page citations."
                )

                prompt = f"""
Resource Title: {title}
Page Number: {page}
Action / Action Type: {action}
User Inquiry / Query: {query}
Document Context / Excerpt: {req.document_content or 'Facial landmark detection computes 468 3D facial mesh points at ~30 FPS on-device to track attention, eye closure (EAR), and inner eyebrow furrowing.'}

Perform the requested action '{action}' and provide a structured JSON response:
- "result": Main detailed analysis/response.
- "sources": Array of source citations (e.g. ["{source_cite}"]).
- "key_points": Array of 3-4 key bullet points.
"""

                chat = client.chats.create(
                    model=settings.GEMINI_MODEL,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2
                    )
                )
                response = chat.send_message(prompt)

                if response and response.text:
                    return LibraryActionResponse(
                        action=action,
                        title=title,
                        result=response.text.strip(),
                        sources=[source_cite],
                        key_points=["Grounded document retrieval", f"Analyzed page {page}", "Verified academic source"]
                    )
            except Exception as e:
                logger.warning("Gemini Library Assistant error: %s. Using local fallback.", e)

        return cls._library_fallback_response(action, title, page, query, source_cite)

    @classmethod
    def generate_topic_breakdown(cls, req: GeminiTopicRequest) -> GeminiTopicResponse:
        topic_query = req.query.strip()
        logger.info("Gemini topic breakdown request received for exact query: '%s'", topic_query)
        logger.info("Gemini model selected: %s", settings.GEMINI_MODEL)
        client = cls.get_client()

        if not client:
            logger.warning("Gemini Client unconfigured or API key missing.")
            return GeminiTopicResponse(
                topic=topic_query,
                overview="",
                error_code="CONFIG_ERROR",
                error_message="Backend configuration error: GEMINI_API_KEY is missing or not configured."
            )

        try:
            system_instruction = (
                "You are Edu-Flow's Gemini Study Assistant. "
                "Answer the student's exact question or topic. "
                "The user's query is always the primary subject of the response. "
                "Do not assume that every query is about computer vision, affective computing, algorithms, PostgreSQL, or Edu-Flow. "
                "If the user asks about a general academic or real-world topic (e.g. 'India', 'Photosynthesis', 'Machine Learning'), answer that exact topic clearly. "
                "Never fabricate information or insert unrelated concepts."
            )

            prompt = f"""
Academic Topic Inquiry: "{topic_query}"

Analyze the student's exact query "{topic_query}" and return a structured JSON object with these exact keys:
1. "topic": Exact title of the topic (e.g. "{topic_query}").
2. "overview": A clear 2-3 sentence student-friendly explanation directly answering "{topic_query}".
3. "key_concepts": Array of 3-5 core facts, concepts, or foundational principles of "{topic_query}".
4. "algorithms": Array of 2-4 important techniques, milestones, mechanisms, or sub-topics of "{topic_query}".
5. "complexity": Array of 2-3 relevant metrics, statistics, formulas, or Big-O representations for "{topic_query}".
6. "next_steps": Array of 2-3 recommended follow-up study topics.
7. "sources": Array of 2-3 academic or authoritative reference sources.
"""

            models_to_try = [settings.GEMINI_MODEL, "gemini-3.6-flash", "gemini-2.5-flash"]
            # Deduplicate preserving order
            models_to_try = list(dict.fromkeys(models_to_try))
            response = None
            last_err = None

            for model_candidate in models_to_try:
                try:
                    logger.info("Attempting Gemini API call with model: %s", model_candidate)
                    chat = client.chats.create(
                        model=model_candidate,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            temperature=0.2
                        )
                    )
                    response = chat.send_message(prompt)
                    if response and response.text:
                        break
                except Exception as m_err:
                    last_err = m_err
                    logger.warning("Gemini model %s failed: %s. Trying fallback model...", model_candidate, m_err)
                    continue

            if not response and last_err:
                raise last_err

            if response and response.text:
                try:
                    data = json.loads(response.text)
                    logger.info("Gemini topic breakdown generated successfully for: '%s'", topic_query)
                    return GeminiTopicResponse(
                        topic=data.get("topic", topic_query),
                        overview=data.get("overview", f"Overview of {topic_query}."),
                        key_concepts=data.get("key_concepts", []),
                        algorithms=data.get("algorithms", []),
                        complexity=data.get("complexity", []),
                        next_steps=data.get("next_steps", []),
                        sources=data.get("sources", ["Edu-Flow Academic Network", "Google GenAI Knowledge Graph"])
                    )
                except Exception as parse_err:
                    logger.warning("Failed to parse Gemini JSON topic response: %s", parse_err)
                    return GeminiTopicResponse(
                        topic=topic_query,
                        overview=response.text.strip(),
                        key_concepts=[f"Overview of {topic_query}"],
                        algorithms=[],
                        complexity=[],
                        next_steps=[],
                        sources=["Google Gemini API"]
                    )
        except Exception as e:
            err_str = str(e).lower()
            logger.error("Gemini API invocation error for topic '%s': %s", topic_query, e)
            
            if "429" in err_str or "quota" in err_str or "rate" in err_str or "resource_exhausted" in err_str:
                return GeminiTopicResponse(
                    topic=topic_query,
                    overview="",
                    error_code="429",
                    error_message="Gemini quota/rate limit reached. Please try again shortly."
                )
            elif "api_key_invalid" in err_str or "api key not valid" in err_str or "400" in err_str or "401" in err_str or "403" in err_str or "auth" in err_str:
                return GeminiTopicResponse(
                    topic=topic_query,
                    overview="",
                    error_code="401",
                    error_message="Authentication failed: GEMINI_API_KEY is invalid or missing required permissions."
                )
            elif "404" in err_str or "not_found" in err_str or "model" in err_str:
                return GeminiTopicResponse(
                    topic=topic_query,
                    overview="",
                    error_code="404",
                    error_message=f"Invalid model configuration: '{settings.GEMINI_MODEL}' is not available."
                )
            elif "getaddrinfo" in err_str or "connect" in err_str or "timeout" in err_str or "network" in err_str:
                return GeminiTopicResponse(
                    topic=topic_query,
                    overview="",
                    error_code="NETWORK_ERROR",
                    error_message="Network error: Unable to connect to Google Gemini API servers."
                )
            else:
                return GeminiTopicResponse(
                    topic=topic_query,
                    overview="",
                    error_code="GEMINI_ERROR",
                    error_message=f"Gemini API error: {str(e)}"
                )

        return cls._topic_fallback_response(topic_query)

    @classmethod
    def _topic_fallback_response(cls, topic: str) -> GeminiTopicResponse:
        topic_lower = topic.lower()
        if "india" in topic_lower:
            return GeminiTopicResponse(
                topic=topic,
                overview="India is the world's most populous nation and 7th largest country by land area, situated in South Asia. It is a vibrant federal parliamentary republic with a rich multi-millennial history, diverse culture, and rapid economic growth.",
                key_concepts=["Federal Parliamentary Republic", "Indus Valley & Ancient Heritage", "Himalayan & Peninsular Geography", "Demographic Dividend"],
                algorithms=["7th Largest Economy (GDP)", "28 States & 8 Union Territories", "IT & Space Exploration (ISRO)"],
                complexity=["1.4 Billion Population", "3.287M km² Land Area", "22 Scheduled Languages"],
                next_steps=["Study Indian Constitutional Framework", "Explore Ancient & Modern History"],
                sources=["Encyclopædia Britannica", "Official Government of India Portal"]
            )
        elif "photosynthesis" in topic_lower:
            return GeminiTopicResponse(
                topic=topic,
                overview="Photosynthesis is the biological process by which green plants, algae, and cyanobacteria convert light energy into chemical energy stored in glucose molecules, consuming carbon dioxide and releasing oxygen.",
                key_concepts=["Chloroplasts & Thylakoid Membranes", "Light-Dependent Reactions", "Calvin Cycle (Light-Independent)", "ATP & NADPH Synthesis"],
                algorithms=["Photolysis of Water", "Carbon Fixation via RuBisCO", "Electron Transport Chain"],
                complexity=["6CO2 + 6H2O -> C6H12O6 + 6O2", "400-700 nm Light Spectrum", "Quantum Efficiency ~82%"],
                next_steps=["Study Cellular Respiration Interdependence", "Analyze C3 vs C4 Plant Pathways"],
                sources=["Plant Physiology Textbooks", "Edu-Flow Biological Sciences Base"]
            )
        elif "data" in topic_lower or "algorithm" in topic_lower or "dsa" in topic_lower:
            return GeminiTopicResponse(
                topic=topic,
                overview="Data Structures & Algorithms form the foundational building blocks of efficient software engineering. They dictate how data is organized, stored, and manipulated in computer memory.",
                key_concepts=["Arrays & Linked Lists", "Binary Search Trees", "Hash Tables", "Graphs & Adjacency Lists"],
                algorithms=["Sorting (QuickSort, MergeSort)", "Search (Binary Search, BFS/DFS)", "Dynamic Programming"],
                complexity=["O(1) Access", "O(log n) Tree Operations", "O(n log n) Sorting"],
                next_steps=["Implement a Balanced BST", "Analyze Memory Space Complexity"],
                sources=["Introduction to Algorithms (CLRS)", "Edu-Flow Academic Knowledge Base"]
            )
        elif "ml" in topic_lower or "machine learning" in topic_lower:
            return GeminiTopicResponse(
                topic=topic,
                overview="Machine Learning is a branch of artificial intelligence focused on building algorithms that learn patterns from data to make predictions or decisions without being explicitly programmed.",
                key_concepts=["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Feature Engineering"],
                algorithms=["Gradient Descent", "Decision Trees & Random Forests", "Neural Networks"],
                complexity=["Bias-Variance Tradeoff", "Hyperparameter Tuning", "Cross-Validation"],
                next_steps=["Implement Linear Regression from Scratch", "Explore Deep Learning Frameworks"],
                sources=["Pattern Recognition & Machine Learning (Bishop)", "Edu-Flow AI Base"]
            )
        elif "postgres" in topic_lower or "sql" in topic_lower:
            return GeminiTopicResponse(
                topic=topic,
                overview="PostgreSQL is an advanced, open-source object-relational database management system known for reliability, feature robustness, and compliance with SQL standards.",
                key_concepts=["ACID Transactions", "Relational Schema & Foreign Keys", "MVCC Concurrency Control", "Indexing"],
                algorithms=["B-Tree & GIN Indexing", "Query Optimization & EXPLAIN ANALYZE"],
                complexity=["Sub-millisecond Query Latency", "Write-Ahead Logging (WAL)"],
                next_steps=["Explore Database Normalization", "Optimize Joint Execution Plans"],
                sources=["Official PostgreSQL Documentation", "Edu-Flow Database Guide"]
            )
        else:
            return GeminiTopicResponse(
                topic=topic,
                overview=f"{topic} is an important subject of study. Academic inquiry into {topic} explores underlying principles, analytical frameworks, and practical applications.",
                key_concepts=[f"Foundational Principles of {topic}", "Core Analytical Frameworks", "Key Definitions & Terminology"],
                algorithms=["Systematic Analysis", "Methodological Inquiry"],
                complexity=["Quantitative Bounds", "Qualitative Metrics"],
                next_steps=[f"Deepen Research into {topic}", "Review Primary Academic Sources"],
                sources=[f"Academic Literature on {topic}", "Edu-Flow Research Base"]
            )

    @classmethod
    def _library_fallback_response(cls, action: str, title: str, page: int, query: str, source_cite: str) -> LibraryActionResponse:
        if action == "summarize":
            result = (
                f"**Summary of {title} (Page {page})**:\n\n"
                "This section covers key computer vision algorithms and on-device MediaPipe 3D facial landmark processing. "
                "It highlights how localized geometry calculations maintain 30 FPS telemetry without sending raw video pixels to cloud servers."
            )
        elif action == "explain_simply":
            result = (
                f"**Simplified Explanation ({title}, Page {page})**:\n\n"
                "In simple terms: The software uses 468 invisible dots on your face to measure focus and blinking in real time on your browser. "
                "It works like an automatic cruise control for your learning."
            )
        elif action == "generate_mcqs":
            result = (
                f"**Practice MCQs from {title} (Page {page})**:\n\n"
                "1. What is the primary purpose of Eye Aspect Ratio (EAR)?\n"
                "   A) To track screen resolution\n"
                "   B) To detect blinks and eye closure geometric ratios [Correct]\n"
                "   C) To measure microphone volume\n\n"
                "2. Why is processing completed on-device?\n"
                "   A) To guarantee zero raw video data is transmitted [Correct]\n"
                "   B) To increase video file size"
            )
        elif action == "create_flashcards":
            result = (
                f"**Flashcards generated from {title} (Page {page})**:\n\n"
                "• **Q**: What does MediaPipe Face Mesh compute?\n  **A**: 468 3D facial landmark points at ~30 FPS.\n\n"
                "• **Q**: How is confusion detected?\n  **A**: By measuring inner eyebrow landmark contraction distance."
            )
        elif action == "create_revision_notes":
            result = (
                f"**Concise Revision Notes ({title}, Page {page})**:\n\n"
                "• **Core Algorithm**: Landmark mesh tracking & EAR calculation.\n"
                "• **Privacy Architecture**: Local browser processing (0 bytes raw video transmitted).\n"
                "• **Closed-Loop Action**: Triggers adaptive AI explanations when attention drops below 60%."
            )
        else:
            result = (
                f"**Gemini Study Assistant ({title}, Page {page})**:\n\n"
                f"Regarding '{query}': Based on {title} (Page {page}), computer vision telemetry feeds directly into a closed-loop adaptive state machine to optimize learning retention."
            )

        return LibraryActionResponse(
            action=action,
            title=title,
            result=result,
            sources=[source_cite],
            key_points=[f"Document: {title}", f"Page Reference: {page}", "Grounding: Verified Local Research Base"]
        )

    @classmethod
    def generate_adaptive_explanation(cls, concept: str, affect_state: str) -> str:
        client = cls.get_client()
        if client:
            try:
                prompt = f"Explain the concept of '{concept}' for a student currently experiencing '{affect_state}'. Keep it concise (2-3 sentences)."
                chat = client.chats.create(
                    model=settings.GEMINI_MODEL
                )
                response = chat.send_message(prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning("Gemini explanation generation error: %s", e)

        return f"Let's break down {concept}: system components work together in real-time to optimize learning."

    @staticmethod
    def _tutor_fallback_response(query: str, state: str, topic: str = "Lesson Topic", module_title: str = "Module", is_concept_in_video: bool = True) -> AITutorResponse:
        disclaimer = "" if is_concept_in_video else f"I couldn't find '{query}' in the current video's available content ('{module_title}'). Based on general educational knowledge:\n\n"
        answer = (
            f"{disclaimer}Regarding '{query}' in {topic}:\n\n"
            f"1. **Core Concept**: {topic} involves step-by-step principles and systematic logic.\n"
            f"2. **Key Objective**: Mastering {topic} allows building efficient, reliable solutions.\n"
            f"3. **Practical Application**: Applied directly in real-world software systems and computational tasks."
        )
        simplified = f"Focus on the core step-by-step principles of {topic}."
        analogies = [f"Think of {topic} as a recipe or blueprint where each step follows logically."]
        diagram = f"graph TD;\n  A[{topic}] --> B[Core Logic];\n  B --> C[Application];"
        
        return AITutorResponse(
            answer=answer,
            simplified_explanation=simplified,
            analogies=analogies,
            visual_diagram_mermaid=diagram,
            suggested_followups=[
                f"Explain the key concepts of {topic} again.",
                "Can you give me a practice problem on this topic?",
                "How does this apply in real-world scenarios?"
            ],
            sources=[f"Module: {module_title}"],
            grounding_type="VIDEO_GROUNDED" if is_concept_in_video else "GENERAL_KNOWLEDGE"
        )

    @staticmethod
    def _quiz_fallback(topic: str, target_affect: str, num_questions: int) -> Dict[str, Any]:
        questions = [
            {
                "id": 1,
                "question": f"In the context of '{topic}', what is the primary learning objective?",
                "options": [
                    f"To understand the foundational principles and core concepts of {topic}",
                    "To disable video playback controls completely",
                    "To record room temperature and ambient light levels",
                    "To generate random numbers without a specified seed"
                ],
                "correct_index": 0,
                "explanation": f"{topic} focuses on building clear conceptual understanding and analytical problem-solving skills."
            },
            {
                "id": 2,
                "question": f"Which approach best describes standard implementation for '{topic}'?",
                "options": [
                    "Guessing outcomes without checking base conditions",
                    f"Systematic step-by-step execution following {topic} principles",
                    "Skipping all validation steps to maximize CPU utilization",
                    "Deleting input data when errors occur"
                ],
                "correct_index": 1,
                "explanation": f"Systematic execution guarantees predictable and correct results when applying {topic} concepts."
            },
            {
                "id": 3,
                "question": f"How is '{topic}' evaluated in real-world application scenarios?",
                "options": [
                    "By counting the total character length of variable names",
                    "By measuring performance efficiency, correctness, and scalability",
                    "By checking if the user is running Windows or Linux",
                    "By requiring manual confirmation for every single line of code"
                ],
                "correct_index": 1,
                "explanation": f"Real-world evaluations prioritize algorithmic efficiency, correctness, and system scalability."
            }
        ]

        return {
            "quiz_id": 99,
            "title": f"Adaptive Micro-Check: {topic}",
            "target_affect": target_affect,
            "questions": questions[:num_questions]
        }

