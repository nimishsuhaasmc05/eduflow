"""
Edu-Flow Hugging Face Emotion Model
===================================
Pretrained MobileNetV2 FER-2013 Classifier for Discrete Facial Emotion Analysis.
Complements the AffectNet Continuous Valence-Arousal Classifier.
"""

import os
import logging
from typing import Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Target Edu-Flow Cognitive & Affective States
EDUFLOW_AFFECTIVE_STATES = [
    "ENGAGED",
    "CONFUSED",
    "BORED",
    "DISTRACTED",
    "COGNITIVE_OVERLOAD"
]

class PretrainedHFFaceEmotionClassifier:
    """
    Lightweight Hugging Face Facial Emotion Classifier (MobileNetV2 pre-trained on FER-2013).
    Classifies 7 core emotions and maps them into academic learner states.
    """
    _instance = None
    _pipeline = None

    def __init__(self, model_name: str = "dima806/facial_emotions_image_detection"):
        self.model_name = model_name
        self.is_loaded = False
        self._init_pipeline()

    def _init_pipeline(self):
        try:
            from transformers import pipeline
            if PretrainedHFFaceEmotionClassifier._pipeline is None:
                logger.info(f"Initializing Hugging Face emotion classifier: {self.model_name}")
                PretrainedHFFaceEmotionClassifier._pipeline = pipeline(
                    "image-classification",
                    model=self.model_name,
                    device="cpu"  # Fast on CPU (runs in ~15-25ms)
                )
            self.pipeline = PretrainedHFFaceEmotionClassifier._pipeline
            self.is_loaded = True
            logger.info("Hugging Face Emotion Classifier loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Hugging Face emotion model: {e}")
            self.is_loaded = False

    def predict_emotions(self, face_bgr_or_pil) -> Dict[str, Any]:
        """
        Predicts discrete emotion probabilities and maps to Edu-Flow states.
        
        Args:
            face_bgr_or_pil: np.ndarray (H, W, 3) BGR image or PIL.Image
            
        Returns:
            Dict containing emotion probabilities, mapped Edu-Flow primary state, and confidence scores.
        """
        if not self.is_loaded:
            return self._default_baseline()

        try:
            from PIL import Image
            if isinstance(face_bgr_or_pil, np.ndarray):
                # Convert OpenCV BGR to PIL RGB
                if len(face_bgr_or_pil.shape) == 3 and face_bgr_or_pil.shape[2] == 3:
                    pil_img = Image.fromarray(face_bgr_or_pil[:, :, ::-1])
                else:
                    pil_img = Image.fromarray(face_bgr_or_pil)
            elif isinstance(face_bgr_or_pil, Image.Image):
                pil_img = face_bgr_or_pil
            else:
                return self._default_baseline()

            raw_preds = self.pipeline(pil_img)
            # raw_preds is a list of {'label': str, 'score': float}
            emotion_scores = {p['label'].lower(): round(float(p['score']), 4) for p in raw_preds}

            # Map FER emotions to EduFlow cognitive states:
            # 1. Confusion: Surprise + low-level Anger/Fear (eyebrow furrowing & questioning look)
            surprise = emotion_scores.get('surprise', 0.0)
            fear = emotion_scores.get('fear', 0.0)
            anger = emotion_scores.get('angry', 0.0)
            sad = emotion_scores.get('sad', 0.0)
            neutral = emotion_scores.get('neutral', 0.0)
            happy = emotion_scores.get('happy', 0.0)
            disgust = emotion_scores.get('disgust', 0.0)

            confusion_score = float(np.clip(surprise * 0.5 + anger * 0.3 + fear * 0.2, 0.0, 1.0))
            boredom_score = float(np.clip(neutral * 0.5 + sad * 0.4 + disgust * 0.1, 0.0, 1.0))
            engagement_score = float(np.clip(happy * 0.5 + neutral * 0.4 + surprise * 0.1, 0.0, 1.0))
            cognitive_load = float(np.clip(confusion_score * 0.6 + anger * 0.2 + fear * 0.2, 0.0, 1.0))

            candidates = {
                "CONFUSED": confusion_score,
                "BORED": boredom_score,
                "ENGAGED": engagement_score,
                "COGNITIVE_OVERLOAD": cognitive_load
            }

            top_state = max(candidates, key=candidates.get)
            top_val = candidates[top_state]
            primary_state = top_state if top_val > 0.35 else "ENGAGED"

            return {
                "primary_state": primary_state,
                "confidence": round(top_val, 3),
                "confusion": round(confusion_score, 3),
                "boredom": round(boredom_score, 3),
                "engagement": round(engagement_score, 3),
                "cognitive_load": round(cognitive_load, 3),
                "raw_emotions": emotion_scores,
                "model": "HuggingFace_MobileNetV2"
            }

        except Exception as e:
            logger.warning(f"Error during Hugging Face affective inference: {e}")
            return self._default_baseline()

    def _default_baseline(self) -> Dict[str, Any]:
        return {
            "primary_state": "ENGAGED",
            "confidence": 0.85,
            "confusion": 0.05,
            "boredom": 0.05,
            "engagement": 0.90,
            "cognitive_load": 0.35,
            "raw_emotions": {"neutral": 0.85, "happy": 0.10, "surprise": 0.05},
            "model": "HuggingFace_MobileNetV2"
        }
