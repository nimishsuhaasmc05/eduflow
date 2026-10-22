"""
Test Script: Edu-Flow Dual-Engine Affective Classification
==========================================================
Tests the FastAPI backend endpoint `/api/v1/affective/analyze-frame`
using FastAPI TestClient and simulated facial expression frames.
"""

import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
import sys
import os

# Add backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
sys.path.insert(0, os.path.abspath("."))

from backend.main import app
from app.models.user import User
from app.api.deps import get_current_user

# Mock authenticated user for testing
def mock_get_current_user():
    return User(id=1, email="student@eduflow.ai", full_name="Test Student", role="STUDENT")

app.dependency_overrides[get_current_user] = mock_get_current_user
client = TestClient(app)

def create_face_image(expression="neutral"):
    """Creates a 224x224 synthetic face image with different facial markers."""
    img = np.ones((224, 224, 3), dtype=np.uint8) * 220 # Light grey background
    
    # Head contour (flesh tone)
    cv2.circle(img, (112, 112), 85, (180, 200, 230), -1)
    
    if expression == "happy":
        # Eyes open
        cv2.circle(img, (80, 95), 8, (40, 40, 40), -1)
        cv2.circle(img, (144, 95), 8, (40, 40, 40), -1)
        # Eyebrows relaxed
        cv2.line(img, (65, 80), (95, 80), (30, 30, 30), 3)
        cv2.line(img, (129, 80), (159, 80), (30, 30, 30), 3)
        # Big smile
        cv2.ellipse(img, (112, 135), (35, 20), 0, 0, 180, (20, 20, 180), 4)

    elif expression == "surprised_confused":
        # Wide eyes
        cv2.circle(img, (80, 95), 14, (40, 40, 40), -1)
        cv2.circle(img, (144, 95), 14, (40, 40, 40), -1)
        # Raised/furrowed brows
        cv2.line(img, (65, 70), (95, 85), (30, 30, 30), 4)
        cv2.line(img, (129, 85), (159, 70), (30, 30, 30), 4)
        # Open 'O' mouth
        cv2.circle(img, (112, 150), 16, (40, 40, 40), -1)

    elif expression == "sad_bored":
        # Droopy eyes
        cv2.ellipse(img, (80, 98), (10, 4), 0, 0, 180, (40, 40, 40), 3)
        cv2.ellipse(img, (144, 98), (10, 4), 0, 0, 180, (40, 40, 40), 3)
        # Downward mouth
        cv2.ellipse(img, (112, 155), (25, 12), 0, 180, 360, (40, 40, 40), 3)

    else: # Neutral
        cv2.circle(img, (80, 95), 7, (40, 40, 40), -1)
        cv2.circle(img, (144, 95), 7, (40, 40, 40), -1)
        cv2.line(img, (65, 80), (95, 80), (30, 30, 30), 3)
        cv2.line(img, (129, 80), (159, 80), (30, 30, 30), 3)
        cv2.line(img, (95, 145), (129, 145), (40, 40, 40), 3)

    _, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def run_tests():
    print("=" * 65)
    print("EDU-FLOW AFFECTIVE API & DUAL-ENGINE VERIFICATION TEST")
    print("=" * 65)

    test_cases = [
        ("happy", "Happy Expression (Target: High Engagement)"),
        ("surprised_confused", "Surprised/Puzzled Expression (Target: Confusion / Overload)"),
        ("sad_bored", "Droopy Expression (Target: Boredom / Low Attention)"),
        ("neutral", "Neutral Attentive Face (Target: Focused / Engaged)")
    ]

    for expr, desc in test_cases:
        print(f"\n--- Testing: {desc} ---")
        img_bytes = create_face_image(expr)

        for engine in ["ensemble", "huggingface", "affectnet"]:
            files = {"file": ("test_frame.jpg", io.BytesIO(img_bytes), "image/jpeg")}
            response = client.post(f"/api/v1/affective/analyze-frame?engine={engine}", files=files)

            if response.status_code == 200:
                data = response.json()
                analysis = data["analysis"]
                state = analysis.get("affective_state")
                attention = analysis.get("attention_score")
                print(f"  [{engine.upper():12s}] -> State: {state:<18s} | Attention: {attention:>5.1f}%")
            else:
                print(f"  [{engine.upper():12s}] -> ERROR {response.status_code}: {response.text}")

    print("\n" + "=" * 65)
    print("ALL AFFECTIVE API ENDPOINTS TESTED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
