from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AITutorQuery(BaseModel):
    course_id: int
    module_id: Optional[int] = None
    query: Optional[str] = None
    question: Optional[str] = None
    student_affective_state: Optional[str] = "ENGAGED"
    affective_state: Optional[str] = None
    course_title: Optional[str] = None
    module_title: Optional[str] = None
    module_description: Optional[str] = None
    video_url: Optional[str] = None
    video_type: Optional[str] = None
    video_id: Optional[str] = None
    video_title: Optional[str] = None
    video_topic: Optional[str] = None
    module_topic: Optional[str] = None
    course_topic: Optional[str] = None
    transcript: Optional[str] = None
    current_timestamp: Optional[float] = None
    mode: Optional[str] = "VIDEO"  # VIDEO, MODULE, COURSE, LIBRARY, GENERAL

class AITutorResponse(BaseModel):
    answer: str
    simplified_explanation: Optional[str] = None
    analogies: List[str] = []
    visual_diagram_mermaid: Optional[str] = None
    suggested_followups: List[str] = []
    sources: List[str] = []
    grounding_type: Optional[str] = "VIDEO_GROUNDED"  # VIDEO_GROUNDED, GENERAL_KNOWLEDGE, UNGROUNDED
    timestamp_reference: Optional[str] = None
    timestamp_seconds: Optional[float] = None

class VideoAnalysisRequest(BaseModel):
    video_url: str
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    title: Optional[str] = ""
    description: Optional[str] = ""
    transcript: Optional[str] = None
    force_reanalyze: Optional[bool] = False

class VideoAnalysisResponse(BaseModel):
    status: str  # READY, ANALYZING, FAILED
    video_id: Optional[str] = None
    topic: str
    subject: str
    summary: str
    learning_objectives: List[str] = []
    concepts: List[str] = []
    definitions: Dict[str, Any] = {}
    important_points: List[str] = []
    examples: List[str] = []
    procedures: List[str] = []
    formulas: List[str] = []
    timestamps: Dict[str, Any] = {}
    source_type: str
    confidence: float = 0.95
    analysis_model: str = "gemini-3.6-flash"
    analysis_version: str = "v1.0"


class QuizGenerationRequest(BaseModel):
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    topic: str
    target_affect: str = "CONFUSION"
    num_questions: int = 3
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    transcript: Optional[str] = None
    current_timestamp: Optional[float] = None
    exclude_question_ids: Optional[List[str]] = None
    session_index: Optional[int] = 0

class QuizSubmission(BaseModel):
    quiz_id: int
    answers: List[int]  # Selected indices per question

class LibraryActionRequest(BaseModel):
    resource_id: str
    resource_title: str
    action: str
    page_number: Optional[int] = 18
    query: Optional[str] = None
    document_content: Optional[str] = None

class LibraryActionResponse(BaseModel):
    action: str
    title: str
    result: str
    sources: List[str] = []
    mcqs: Optional[List[Dict[str, Any]]] = None
    flashcards: Optional[List[Dict[str, str]]] = None
    key_points: Optional[List[str]] = None

class GeminiTopicRequest(BaseModel):
    query: str

class GeminiTopicResponse(BaseModel):
    topic: str
    overview: str
    key_concepts: List[str] = []
    algorithms: List[str] = []
    complexity: List[str] = []
    next_steps: List[str] = []
    sources: List[str] = []
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class AttentionActivityRequest(BaseModel):
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    topic: str
    preferred_type: Optional[str] = None  # spot_the_concept, sequence_reorder, match_pairs, identify_mistake
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    transcript: Optional[str] = None
    current_timestamp: Optional[float] = None
    session_index: Optional[int] = 0

class AttentionActivityResponse(BaseModel):
    activity_id: str
    activity_type: str  # spot_the_concept | sequence_reorder | match_pairs | identify_mistake
    title: str
    instructions: str
    topic: str
    duration_seconds: int = 45
    payload: Dict[str, Any]
    encouragement: str

class AttentionActivitySubmission(BaseModel):
    activity_id: str
    activity_type: str
    completed: bool
    score_percentage: float = 100.0
    time_spent_seconds: float = 30.0
    course_id: Optional[int] = None
    module_id: Optional[int] = None

