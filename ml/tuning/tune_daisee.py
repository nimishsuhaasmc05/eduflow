"""
Edu-Flow DAiSEE Fine-Tuning Pipeline
====================================
Fine-tunes AffectNet / MobileNet representations on the DAiSEE benchmark
(Dataset for Affective States in E-Environments).
Adheres to Table II & Section IV-C of Edu-Flow research paper.
"""

import os
import sys
import argparse
import logging
from typing import Dict, List, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger("EduFlow.DAiSEE_Tuning")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DAISEE_TARGETS = ["Boredom", "Engagement", "Confusion", "Frustration"]

def build_fine_tune_model(backbone_name: str = "tf_efficientnet_b0.ns_jft_in1k", pretrained_weights: str = None):
    """
    Builds the complete model: Frozen Pretrained Backbone + Multi-Task Academic Head.
    """
    import torch
    import torch.nn as nn
    import timm

    logger.info(f"Loading backbone: {backbone_name}")
    backbone = timm.create_model(backbone_name, pretrained=True, num_classes=0) # Pooled features output (1280 dim)
    
    # Freeze the backbone feature extractor for fast training
    for param in backbone.parameters():
        param.requires_grad = False

    class EduFlowModel(nn.Module):
        def __init__(self, feature_extractor, in_features=1280, num_classes=4):
            super().__init__()
            self.backbone = feature_extractor
            self.head = nn.Sequential(
                nn.Linear(in_features, 512),
                nn.BatchNorm1d(512),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(512, 128),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(128, num_classes) # Outputs: [Boredom, Engagement, Confusion, Frustration]
            )

        def forward(self, x):
            feats = self.backbone(x)
            return self.head(feats)

    model = EduFlowModel(backbone)
    logger.info("Transfer learning model built. Backbone frozen, head trainable.")
    return model

def create_synthetic_demo_data(output_dir: str = "./ml/data/DAiSEE_demo", num_samples: int = 100):
    """
    Generates a tiny demo dataset format matching DAiSEE structure so the pipeline
    can be tested immediately even before downloading the multi-gigabyte video dataset.
    """
    import cv2
    os.makedirs(f"{output_dir}/frames", exist_ok=True)
    records = []

    for i in range(num_samples):
        filename = f"frame_{i:04d}.jpg"
        img = np.random.randint(50, 220, (224, 224, 3), dtype=np.uint8)
        cv2.imwrite(f"{output_dir}/frames/{filename}", img)

        # Labels: Boredom, Engagement, Confusion, Frustration (0 to 3 rating)
        label_vec = [np.random.randint(0, 4) for _ in range(4)]
        dominant_idx = int(np.argmax(label_vec))
        records.append({
            "ClipID": filename,
            "Boredom": label_vec[0],
            "Engagement": label_vec[1],
            "Confusion": label_vec[2],
            "Frustration": label_vec[3],
            "DominantState": dominant_idx
        })

    df = pd.DataFrame(records)
    csv_path = f"{output_dir}/labels.csv"
    df.to_csv(csv_path, index=False)
    logger.info(f"Created demo DAiSEE dataset at {output_dir} ({num_samples} samples)")
    return csv_path, f"{output_dir}/frames"

def train_daisee(data_dir: str, epochs: int = 10, batch_size: int = 16, lr: float = 1e-3, output_path: str = "./ml/models/eduflow_daisee_tuned.pth"):
    """
    Executes fine-tuning loop.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import Dataset, DataLoader
    from PIL import Image
    import torchvision.transforms as transforms

    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    logger.info(f"Using training accelerator device: {device}")

    # Check for DAiSEE labels
    labels_csv = os.path.join(data_dir, "labels.csv")
    frames_dir = os.path.join(data_dir, "frames")

    if not os.path.exists(labels_csv):
        logger.warning(f"DAiSEE data not found at {data_dir}. Creating demo pipeline data to verify execution...")
        labels_csv, frames_dir = create_synthetic_demo_data(data_dir)

    df = pd.read_csv(labels_csv)

    # Dataset definition
    class DAiSEEDataset(Dataset):
        def __init__(self, dataframe, img_dir, transform=None):
            self.df = dataframe
            self.img_dir = img_dir
            self.transform = transform

        def __len__(self):
            return len(self.df)

        def __getitem__(self, idx):
            row = self.df.iloc[idx]
            img_path = os.path.join(self.img_dir, str(row["ClipID"]))
            img = Image.open(img_path).convert("RGB")
            if self.transform:
                img = self.transform(img)
            target = int(row.get("DominantState", np.argmax([row["Boredom"], row["Engagement"], row["Confusion"], row["Frustration"]])))
            return img, target

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    dataset = DAiSEEDataset(df, frames_dir, transform=transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = build_fine_tune_model()
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.head.parameters(), lr=lr, weight_decay=1e-4)

    logger.info(f"Beginning fine-tuning for {epochs} epochs...")
    model.train()

    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0
        total = 0

        for images, targets in dataloader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(targets)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == targets).sum().item()
            total += len(targets)

        epoch_loss = total_loss / total
        epoch_acc = (correct / total) * 100.0
        logger.info(f"Epoch [{epoch:02d}/{epochs:02d}] - Loss: {epoch_loss:.4f} | Training Accuracy: {epoch_acc:.1f}%")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    torch.save(model.state_dict(), output_path)
    logger.info(f"Fine-tuning complete! Model checkpoint saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune AffectNet model on DAiSEE")
    parser.add_argument("--data_dir", type=str, default="./ml/data/DAiSEE_demo", help="Path to dataset directory")
    parser.add_argument("--epochs", type=int, default=5, help="Number of fine-tuning epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--output_path", type=str, default="./ml/models/eduflow_daisee_tuned.pth")
    args = parser.parse_args()

    train_daisee(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        output_path=args.output_path
    )
