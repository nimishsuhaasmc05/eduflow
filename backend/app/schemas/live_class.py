from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CreateLiveClassRequest(BaseModel):
    title: str
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    max_students: Optional[int] = 50
    start_now: bool = True

class LiveClassResponse(BaseModel):
    id: int
    class_id: Optional[int] = None
    room_id: Optional[str] = None
    join_code: Optional[str] = None
    teacher_id: int
    teacher_name: str
    course_id: Optional[int] = None
    course_title: Optional[str] = None
    module_id: Optional[int] = None
    module_title: Optional[str] = None
    title: str
    description: Optional[str] = None
    class_code: str
    join_token: str
    join_url: str
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: str
    active_participants_count: int = 0
    active_quiz: Optional[Dict[str, Any]] = None

class ValidateJoinRequest(BaseModel):
    token_or_code: str

class JoinClassResponse(BaseModel):
    valid: bool
    class_id: Optional[int] = None
    join_token: Optional[str] = None
    class_code: Optional[str] = None
    title: Optional[str] = None
    teacher_name: Optional[str] = None
    course_title: Optional[str] = None
    module_title: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    active_quiz: Optional[Dict[str, Any]] = None

class ClassTelemetrySample(BaseModel):
    class_id: int
    timestamp_seconds: float = 0.0
    attention: float = 0.85
    confusion: float = 0.15
    boredom: float = 0.10
    engagement: float = 0.85
    distraction: float = 0.05
    cognitive_load: float = 0.40
    webcam_active: bool = True
    primary_state: str = "FOCUSED"

class TeacherLiveAnalyticsResponse(BaseModel):
    class_id: int
    status: str
    total_participants: int
    camera_active_count: int
    avg_engagement: float
    avg_focus: float
    avg_confusion: float
    avg_distraction: float
    avg_cognitive_load: float
    engagement_timeline: List[Dict[str, Any]]
    heatmap_timeline: List[Dict[str, Any]]
    student_cards: List[Dict[str, Any]]
    recent_events: List[Dict[str, Any]]
    confusion_hotspot_detected: bool = False
    recommended_intervention: Optional[str] = None

class ClassAIQueryRequest(BaseModel):
    class_id: int
    question: str

class ClassAIQueryResponse(BaseModel):
    answer: str
    cited_analytics: Dict[str, Any]

class LaunchClassQuizRequest(BaseModel):
    class_id: Optional[int] = None
    topic: str
    difficulty: Optional[str] = "MEDIUM"
    num_questions: Optional[int] = 3
    notes_text: Optional[str] = None

class SubmitClassQuizRequest(BaseModel):
    class_id: int
    quiz_id: int
    answers: List[int]

class ClassQuizResponse(BaseModel):
    quiz_id: int
    topic: str
    questions: List[Dict[str, Any]]

class SubmitQuizResultResponse(BaseModel):
    score_percentage: float
    affective_recovery_status: str
