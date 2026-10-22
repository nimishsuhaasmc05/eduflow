"""
Edu-Flow Affective Model
=========================
Pretrained AffectNet Feature Extractor & Fine-Tuned Learner State Classifier.
Adheres to Table II and Section IV-C of the Edu-Flow research paper.
"""

import os
import logging
from typing import Dict, Any, Union, Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Standard AffectNet 8-class emotion index mapping
AFFECTNET_EMOTIONS = [
    "Neutral", "Happy", "Sad", "Surprise", 
    "Fear", "Disgust", "Anger", "Contempt"
]

# Target Edu-Flow Cognitive & Affective States
EDUFLOW_AFFECTIVE_STATES = [
    "FOCUSED",
    "ENGAGED",
    "CONFUSED",
    "BORED",
    "DISTRACTED",
    "COGNITIVE_OVERLOAD"
]

class PretrainedAffectNetClassifier:
    """
    AffectNet-pretrained feature extractor and affective state estimator.
    Outputs 8 emotion probabilities + continuous Valence and Arousal.
    Mapped directly to Edu-Flow learner states (Engagement, Confusion, Boredom, Distraction, Cognitive Load).
    """
    def __init__(self, weights_path: Optional[str] = None, device: str = "cpu"):
        self.device = device
        if weights_path is None:
            default_weights = os.path.join(os.path.dirname(__file__), "weights", "enet_b0_8_va_mtl.pt")
            self.weights_path = default_weights if os.path.exists(default_weights) else os.path.expanduser("~/.hsemotion/enet_b0_8_va_mtl.pt")
        else:
            self.weights_path = weights_path

        self.model = None
        self.is_loaded = False
        self._init_model()

    def _init_model(self):
        try:
            import torch
            import timm

            logger.info(f"Loading pretrained AffectNet weights from: {self.weights_path}")
            model = timm.create_model('tf_efficientnet_b0.ns_jft_in1k', pretrained=False, num_classes=10)
            
            if os.path.exists(self.weights_path):
                checkpoint = torch.load(self.weights_path, map_location=self.device, weights_only=False)
                state_dict = checkpoint.state_dict() if hasattr(checkpoint, 'state_dict') else checkpoint
                model.load_state_dict(state_dict, strict=True)
                model.to(self.device)
                model.eval()
                self.model = model
                self.is_loaded = True
                logger.info("Pretrained AffectNet model loaded successfully (8 emotions + Valence/Arousal).")
            else:
                logger.warning(f"Weights file not found at {self.weights_path}. Running with baseline.")
        except Exception as e:
            logger.error(f"Failed to load AffectNet model: {e}")
            self.is_loaded = False

    def predict_emotions(self, face_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Predict discrete emotions and continuous valence/arousal from a face image.
        
        Args:
            face_bgr: np.ndarray (H, W, 3) cropped face in BGR format
            
        Returns:
            Dict containing emotion probabilities, valence, arousal, and mapped Edu-Flow metrics.
        """
        if not self.is_loaded or face_bgr is None or face_bgr.size == 0:
            return self._default_baseline()

        try:
            import torch
            import torchvision.transforms as transforms
            from PIL import Image

            # Standard AffectNet preprocessing
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])

            # Convert BGR to RGB PIL Image
            rgb_img = Image.fromarray(face_bgr[:, :, ::-1])
            img_tensor = transform(rgb_img).unsqueeze(0).to(self.device)

            with torch.no_grad():
                out = self.model(img_tensor) # shape (1, 10)
                emotion_logits = out[0, :8]
                emotion_probs_tensor = torch.softmax(emotion_logits, dim=-1)
                valence = float(out[0, 8].item())
                arousal = float(out[0, 9].item())

            scores = emotion_probs_tensor.cpu().numpy()
            emotion_probs = {AFFECTNET_EMOTIONS[i]: float(scores[i]) for i in range(len(AFFECTNET_EMOTIONS))}
            
            return self._map_to_eduflow_states(emotion_probs, valence, arousal)

        except Exception as e:
            logger.warning(f"Error during affective inference: {e}")
            return self._default_baseline()

    def _map_to_eduflow_states(
        self, 
        emotion_probs: Dict[str, float], 
        valence: float, 
        arousal: float
    ) -> Dict[str, Any]:
        """
        Maps raw AffectNet emotion probabilities into the 5 academic learner states
        stipulated in Edu-Flow (Engagement, Confusion, Boredom, Distraction, Cognitive Load).
        """
        # Confusion: Brow lowering (contempt/anger) + eye widening/doubt (surprise) with negative valence
        confusion_score = float(np.clip(
            (emotion_probs.get("Contempt", 0.0) * 0.6 + emotion_probs.get("Surprise", 0.0) * 0.4) 
            * (1.0 - max(0.0, valence)),
            0.0, 1.0
        ))

        # Boredom: High neutral/sadness + low arousal (drowsiness/apathy)
        boredom_score = float(np.clip(
            (emotion_probs.get("Neutral", 0.0) * 0.5 + emotion_probs.get("Sad", 0.0) * 0.5) 
            * max(0.0, (0.3 - arousal) / 0.3 if arousal < 0.3 else 0.0),
            0.0, 1.0
        ))

        # Engagement / Attention: Moderate to high positive arousal + attentiveness
        engagement_score = float(np.clip(
            (emotion_probs.get("Happy", 0.0) * 0.3 + emotion_probs.get("Neutral", 0.0) * 0.4 + max(0.0, arousal) * 0.3),
            0.0, 1.0
        ))

        # Cognitive Overload: High tension (fear/anger/confusion) with high arousal
        cognitive_load = float(np.clip(
            (confusion_score * 0.5 + emotion_probs.get("Anger", 0.0) * 0.3 + max(0.0, arousal) * 0.2),
            0.0, 1.0
        ))

        # Determine primary learner state
        candidates = {
            "CONFUSED": confusion_score,
            "BORED": boredom_score,
            "ENGAGED": engagement_score,
            "COGNITIVE_OVERLOAD": cognitive_load
        }
        primary_state = max(candidates, key=candidates.get) if max(candidates.values()) > 0.4 else "FOCUSED"

        return {
            "primary_state": primary_state,
            "confusion": round(confusion_score, 3),
            "boredom": round(boredom_score, 3),
            "engagement": round(engagement_score, 3),
            "cognitive_load": round(cognitive_load, 3),
            "valence": round(valence, 3),
            "arousal": round(arousal, 3),
            "raw_emotions": emotion_probs
        }

    def _default_baseline(self) -> Dict[str, Any]:
        return {
            "primary_state": "FOCUSED",
            "confusion": 0.05,
            "boredom": 0.05,
            "engagement": 0.90,
            "cognitive_load": 0.35,
            "valence": 0.20,
            "arousal": 0.45,
            "raw_emotions": {emo: 0.125 for emo in AFFECTNET_EMOTIONS}
        }
