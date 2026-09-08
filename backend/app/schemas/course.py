from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 1
    duration_minutes: int = 15
    video_url: Optional[str] = None
    source_type: Optional[str] = "url"
    transcript: Optional[str] = None

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    duration_minutes: Optional[int] = None
    video_url: Optional[str] = None
    source_type: Optional[str] = None
    transcript: Optional[str] = None

class ModuleResponse(ModuleBase):
    id: int
    course_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: str
    category: str = "Computer Science"
    difficulty: str = "Intermediate"
    thumbnail_url: Optional[str] = None
    status: Optional[str] = "published"
    learning_objectives: Optional[str] = None
    duration_hours: Optional[float] = 5.0
    rating: Optional[float] = 4.8
    is_premium: Optional[bool] = False

class CourseCreate(CourseBase):
    modules: Optional[List[ModuleCreate]] = []

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: Optional[str] = None
    learning_objectives: Optional[str] = None
    duration_hours: Optional[float] = None
    rating: Optional[float] = None
    is_premium: Optional[bool] = None

class CourseResponse(CourseBase):
    id: int
    teacher_id: int
    created_at: datetime
    is_premium: bool = False
    is_enrolled: Optional[bool] = False
    modules: List[ModuleResponse] = []

    class Config:
        from_attributes = True

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    progress_percentage: float
    is_completed: bool
    last_accessed_at: datetime

    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    progress_percentage: float

class ModuleReorderItem(BaseModel):
    id: int
    order: int

class ModuleReorderRequest(BaseModel):
    modules: List[ModuleReorderItem]
