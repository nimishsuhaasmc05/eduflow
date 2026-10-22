"""
Edu-Flow Model Exporter (ONNX / Web Formats)
============================================
Exports fine-tuned PyTorch affective models into ONNX format for client-side
browser execution via ONNX Runtime WebAssembly (Edge Intelligence per Table II).
"""

import os
import sys
import argparse
import logging
import torch

sys.path.insert(0, os.path.abspath("."))

logger = logging.getLogger("EduFlow.Export")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def export_to_onnx(model, output_path: str):
    """
    Exports a PyTorch model into ONNX format.
    """
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        model.eval()
        model.to("cpu")
        dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)
        
        logger.info(f"Exporting model to ONNX: {output_path}")
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=18,
            do_constant_folding=True,
            input_names=['input_face'],
            output_names=['affect_outputs'],
            dynamic_axes={'input_face': {0: 'batch_size'}}
        )
        logger.info(f"ONNX export successful: {output_path} ({os.path.getsize(output_path) / (1024*1024):.2f} MB)")
        return True
    except Exception as e:
        logger.error(f"Failed to export to ONNX: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Export EduFlow Affective Models to ONNX")
    parser.add_argument("--checkpoint", type=str, default="./ml/models/eduflow_daisee_tuned.pth", help="Path to tuned PyTorch checkpoint")
    parser.add_argument("--onnx_out", type=str, default="./frontend/public/models/affective/eduflow_daisee.onnx", help="Output path for ONNX model")
    args = parser.parse_args()

    logger.info("Starting Edu-Flow Edge Model Exporter...")
    if not os.path.exists(args.checkpoint):
        logger.error(f"Checkpoint not found at: {args.checkpoint}. Please run fine-tuning first.")
        return

    # Load tuned model architecture
    from ml.tuning.tune_daisee import build_fine_tune_model
    model = build_fine_tune_model()
    checkpoint = torch.load(args.checkpoint, map_location="cpu")
    model.load_state_dict(checkpoint)
    logger.info(f"Loaded tuned checkpoint from {args.checkpoint}")

    # Export to ONNX
    success = export_to_onnx(model, args.onnx_out)
    if success:
        logger.info("Edu-Flow ONNX model export completed and ready for browser deployment!")

if __name__ == "__main__":
    main()
