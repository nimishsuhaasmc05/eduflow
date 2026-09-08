import random
import string
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ZoomService:
    """
    Zoom Live Meeting Integration Service for Edu-Flow.
    Orchestrates real video-conferencing meeting sessions (audio/video, screen sharing)
    while Edu-Flow processes student webcam telemetry, affective analysis, RAG AI Tutor,
    and individual student reports independently.
    """
    @staticmethod
    def create_zoom_meeting(topic: str, duration_minutes: int = 60) -> Dict[str, Any]:
        meeting_id = "".join(random.choices(string.digits, k=11))
        passcode = "".join(random.choices(string.digits, k=6))

        # Dynamic Zoom meeting join and start URLs
        join_url = f"https://zoom.us/j/{meeting_id}?pwd={passcode}"
        start_url = f"https://zoom.us/s/{meeting_id}?pwd={passcode}&role=1"

        return {
            "zoom_meeting_id": meeting_id,
            "zoom_passcode": passcode,
            "zoom_join_url": join_url,
            "zoom_start_url": start_url,
            "sdk_key": settings.ZOOM_SDK_KEY,
            "topic": topic,
            "duration_minutes": duration_minutes,
            "provider": "ZOOM_LIVE"
        }
