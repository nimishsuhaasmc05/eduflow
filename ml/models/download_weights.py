"""
Edu-Flow Pretrained Weight Downloader
======================================
Downloads AffectNet-pretrained HSEmotion/MobileNetV3 weights (~15MB)
for Affective Classification per Table II & Section IV-C of the Edu-Flow paper.
"""

import os
import urllib.request
import logging

logger = logging.getLogger("EduFlow.Downloader")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Official HSE-Emotion AffectNet weights
MODEL_URLS = {
    "enet_b0_8_va_mtl": "https://github.com/HSE-asavchenko/face-emotion-recognition/releases/download/v0.2/enet_b0_8_va_mtl.pt",
    "enet_b0_8_best_afew": "https://github.com/HSE-asavchenko/face-emotion-recognition/releases/download/v0.2/enet_b0_8_best_afew.pt",
}

DEFAULT_TARGET_DIR = os.path.join(os.path.dirname(__file__), "weights")

def download_model(model_name: str = "enet_b0_8_va_mtl", target_dir: str = DEFAULT_TARGET_DIR) -> str:
    """
    Downloads the selected pretrained model weights.
    """
    if model_name not in MODEL_URLS:
        raise ValueError(f"Unknown model name: {model_name}. Available: {list(MODEL_URLS.keys())}")

    os.makedirs(target_dir, exist_ok=True)
    filename = f"{model_name}.pt"
    file_path = os.path.join(target_dir, filename)

    if os.path.exists(file_path) and os.path.getsize(file_path) > 1000000:
        logger.info(f"Model weights already present: {file_path} ({os.path.getsize(file_path) / (1024*1024):.2f} MB)")
        return file_path

    url = MODEL_URLS[model_name]
    logger.info(f"Downloading pretrained AffectNet weights ({model_name}) from: {url}")
    
    def reporthook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        if count % 200 == 0 or percent == 100:
            logger.info(f"Downloading {filename}: {percent}% ({count * block_size / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB)")

    urllib.request.urlretrieve(url, file_path, reporthook)
    logger.info(f"Successfully downloaded weights to: {file_path}")
    return file_path

if __name__ == "__main__":
    download_model("enet_b0_8_va_mtl")
