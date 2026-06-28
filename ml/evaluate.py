"""
evaluate.py — Top-1 accuracy measurement on the Food-101 test split.

Loads the trained model from ml/food_classifier.pth, runs inference over
the full Food-101 test set, prints the top-1 accuracy, and exits with a
non-zero code if accuracy is below the 85 % threshold (Requirement 1.6).

Usage:
    python ml/evaluate.py
"""

import sys

import torch
from torch.utils.data import DataLoader
import torchvision.datasets

# Import shared constants and utilities from train.py so that the evaluation
# pipeline uses identical transforms, paths, and thresholds.
from ml.train import (
    build_model,
    DATA_DIR,
    MODEL_SAVE_PATH,
    ACCURACY_THRESHOLD,
    val_transform,
    BATCH_SIZE,
    NUM_WORKERS,
)


def load_model(path: str) -> torch.nn.Module:
    """
    Reconstruct the model architecture and load saved weights.

    Steps:
      1. Build the EfficientNetV2-S architecture with a 101-class head.
      2. Load the state dict from disk (CPU mapping for portability).
      3. Apply the weights via load_state_dict.
      4. Switch to eval mode to disable dropout / batch-norm training behaviour.

    Exits with a non-zero code if the file is missing or the weights are
    corrupt / incompatible, as required by Requirement 1.6.
    """
    model = build_model()

    try:
        state_dict = torch.load(path, map_location="cpu", weights_only=True)
    except FileNotFoundError:
        print(
            f"ERROR: model weights not found at '{path}'. "
            "Run ml/train.py first to produce food_classifier.pth.",
            file=sys.stderr,
        )
        sys.exit(1)
    except Exception as exc:
        print(
            f"ERROR: failed to load model weights from '{path}': {exc}",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        model.load_state_dict(state_dict)
    except Exception as exc:
        print(
            f"ERROR: model weights are corrupt or incompatible: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)

    model.eval()
    return model


def build_test_loader(data_dir: str) -> DataLoader:
    """
    Download Food-101 (if necessary) and return a DataLoader over the test split.

    The same val_transform as used during training is applied so that
    evaluation conditions are consistent with the validation pass in train.py.
    """
    test_dataset = torchvision.datasets.Food101(
        root=data_dir,
        split="test",
        transform=val_transform,
        download=True,
    )
    return DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )


@torch.no_grad()
def compute_top1_accuracy(model: torch.nn.Module, loader: DataLoader) -> float:
    """
    Iterate over all batches in *loader* and return the top-1 accuracy as a
    fraction in [0, 1].

    Using torch.no_grad() avoids building a computation graph during
    inference, reducing memory use and speeding up the evaluation loop.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    correct = 0
    total = 0

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        logits = model(images)
        # Top-1 prediction: the class with the highest logit value.
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return correct / total if total > 0 else 0.0


def main() -> None:
    print(f"Loading model from '{MODEL_SAVE_PATH}' …")
    model = load_model(MODEL_SAVE_PATH)

    print(f"Loading Food-101 test split from '{DATA_DIR}' …")
    test_loader = build_test_loader(DATA_DIR)

    print(f"Evaluating over {len(test_loader.dataset):,} test images …")
    acc = compute_top1_accuracy(model, test_loader)

    # Required output format (Requirement 1.6).
    print(f"Top-1 accuracy: {acc * 100:.2f}%")

    if acc < ACCURACY_THRESHOLD:
        print(
            f"ERROR: top-1 accuracy {acc * 100:.2f}% is below the required "
            f"threshold of {ACCURACY_THRESHOLD * 100:.0f}%.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(
        f"Accuracy threshold of {ACCURACY_THRESHOLD * 100:.0f}% met — evaluation passed."
    )


if __name__ == "__main__":
    main()
