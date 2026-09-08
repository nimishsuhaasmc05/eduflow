from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class AffectiveHeatmapPoint(BaseModel):
    timestamp_seconds: float
    avg_attention: float
    avg_confusion: float
    avg_boredom: float
    avg_engagement: float
    avg_cognitive_load: float

class TeacherCourseAnalytics(BaseModel):
    course_id: int
    total_enrolled: int
    avg_completion_rate: float
    avg_attention_score: float
    avg_confusion_score: float
    heatmap_timeline: List[AffectiveHeatmapPoint]
    confusion_hotspots_count: int

class SystemMetricsResponse(BaseModel):
    total_users: int
    active_students: int
    active_teachers: int
    total_courses: int
    telemetry_events_processed: int
    ai_tokens_consumed: int
    system_health: str = "100% Operational"
