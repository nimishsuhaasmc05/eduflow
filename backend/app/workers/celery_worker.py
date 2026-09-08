import logging
from celery import Celery
from app.core.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "eduflow_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

logger.info("Celery worker initialized and connecting to Redis broker: %s", settings.REDIS_URL)

@celery_app.task
def generate_class_affective_report(course_id: int):
    logger.info("Generating automated AI class affective report for course %s...", course_id)
    return {"status": "completed", "course_id": course_id}
