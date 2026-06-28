"""
train.py — Two-phase fine-tuning of EfficientNetV2-S on Food-101.

Phase 1 (this file): Freeze the entire EfficientNetV2-S backbone and train
                     only the newly-attached classification head for 5 epochs
                     using Adam (lr=1e-3, weight_decay=1e-4) and CrossEntropyLoss.

Phase 2 (added in task 4.3): Unfreeze all parameters, attach CosineAnnealingLR,
                              and fine-tune for 10 epochs at lr=1e-4.

Usage:
    python ml/train.py

Output:
    ml/food_classifier.pth  — serialised model weights after training completes.
"""

import sys
import os

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import efficientnet_v2_s, EfficientNet_V2_S_Weights


# ---------------------------------------------------------------------------
# Hyper-parameters
# ---------------------------------------------------------------------------
PHASE1_LR = 1e-3          # learning rate for phase 1 (head only)
PHASE1_WEIGHT_DECAY = 1e-4  # L2 regularisation strength (same for both phases)
PHASE1_EPOCHS = 5         # number of epochs to train the head in phase 1
NUM_CLASSES = 101         # Food-101 has exactly 101 categories
BATCH_SIZE = 64
NUM_WORKERS = 4           # data-loader worker processes; set to 0 on Windows

# Dataset is downloaded to this directory (change if disk space is limited).
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Final weights are written here (phase 2 will overwrite with the fully
# fine-tuned version; phase 1 writes an intermediate checkpoint).
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "food_classifier.pth")


# ---------------------------------------------------------------------------
# Data transforms — standard ImageNet normalisation used throughout both phases
# ---------------------------------------------------------------------------
_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]

train_transform = transforms.Compose([
    # Resize the shorter side to 256, then take a random 224×224 crop.
    transforms.Resize(256),
    transforms.RandomCrop(224),
    # Light augmentation helps the head generalise without heavy compute.
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    # Normalise using the ImageNet channel statistics that EfficientNetV2-S
    # was pretrained with, so the pretrained features remain meaningful.
    transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
])

val_transform = transforms.Compose([
    # Deterministic centre-crop for validation — no random augmentation.
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=_IMAGENET_MEAN, std=_IMAGENET_STD),
])


def get_dataloaders(data_dir: str) -> tuple[DataLoader, DataLoader]:
    """Download Food-101 (if necessary) and return (train_loader, val_loader)."""
    # torchvision.datasets.Food101 downloads and extracts the dataset
    # automatically on first call.
    train_dataset = datasets.Food101(
        root=data_dir,
        split="train",
        transform=train_transform,
        download=True,
    )
    val_dataset = datasets.Food101(
        root=data_dir,
        split="test",
        transform=val_transform,
        download=True,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=torch.cuda.is_available(),
    )
    return train_loader, val_loader


def build_model() -> nn.Module:
    """
    Construct EfficientNetV2-S with a custom 101-class head.

    Steps:
      1. Load EfficientNetV2-S with ImageNet-pretrained weights.
      2. Freeze every parameter in the backbone so the pretrained
         feature extractor is not corrupted during phase 1.
      3. Replace the final classifier head with a new Linear layer
         that maps the 1280-d feature vector to NUM_CLASSES logits.
         The new head starts with random weights and is the only part
         updated in phase 1.
    """
    # --- Step 1: load EfficientNetV2-S with ImageNet pretrained weights -------
    # EfficientNet_V2_S_Weights.IMAGENET1K_V1 is the recommended torchvision
    # weight set for this architecture.
    model = efficientnet_v2_s(weights=EfficientNet_V2_S_Weights.IMAGENET1K_V1)

    # --- Step 2: freeze the entire backbone ------------------------------------
    # Setting requires_grad=False on every parameter disables gradient
    # accumulation for those tensors, so the Adam optimiser will not update
    # them.  This is the "frozen backbone" strategy from Two_Phase_Training.
    for param in model.parameters():
        param.requires_grad = False

    # --- Step 3: replace and initialise the classification head ---------------
    # EfficientNetV2-S stores its head at model.classifier[1] (a Linear
    # layer with in_features=1280 by default).  We replace it with a new
    # Linear layer whose requires_grad is True by default (since we never
    # called requires_grad=False on it after construction).
    in_features = model.classifier[1].in_features  # 1280
    model.classifier[1] = nn.Linear(in_features, NUM_CLASSES)
    # The new head inherits requires_grad=True from nn.Linear's default
    # initialisation — no explicit assignment needed.

    return model


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimiser: torch.optim.Optimizer,
    device: torch.device,
    epoch: int,
) -> float:
    """Run one training epoch and return the average cross-entropy loss."""
    model.train()
    running_loss = 0.0

    for batch_idx, (images, labels) in enumerate(loader):
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        # Zero gradients before the forward pass so that gradients from
        # previous batches do not accumulate.
        optimiser.zero_grad()

        # Forward pass through the model.
        logits = model(images)

        # --- Loss computation --------------------------------------------------
        # CrossEntropyLoss combines LogSoftmax + NLLLoss.  It expects raw logits
        # (not softmax outputs) and integer class indices as targets.
        loss = criterion(logits, labels)

        # Backward pass: compute gradients for all tensors that have
        # requires_grad=True (i.e., only the classification head in phase 1).
        loss.backward()

        # Parameter update step — Adam updates head weights using the
        # gradients computed above.
        optimiser.step()

        running_loss += loss.item()

        if (batch_idx + 1) % 100 == 0:
            avg = running_loss / (batch_idx + 1)
            print(
                f"  Epoch {epoch+1} | batch {batch_idx+1}/{len(loader)} "
                f"| avg loss {avg:.4f}"
            )

    return running_loss / len(loader)


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
) -> float:
    """Return top-1 accuracy on the provided data loader."""
    model.eval()
    correct = 0
    total = 0

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        logits = model(images)
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return correct / total if total > 0 else 0.0


def train_phase1(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
) -> None:
    """
    Phase 1 training: frozen backbone, head-only optimisation.

    - 5 epochs
    - Adam optimiser with lr=1e-3, weight_decay=1e-4
    - CrossEntropyLoss
    """
    # CrossEntropyLoss is the standard objective for multi-class classification.
    # It computes the negative log-likelihood of the correct class using
    # log-softmax probabilities derived from the model's raw logits.
    criterion = nn.CrossEntropyLoss()

    # Adam with weight decay regularises the head weights to reduce overfitting.
    # Only parameters with requires_grad=True (the head) are passed here;
    # passing frozen parameters would waste memory and have no effect.
    optimiser = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=PHASE1_LR,
        weight_decay=PHASE1_WEIGHT_DECAY,
    )

    print("=" * 60)
    print("Phase 1: head training with frozen backbone")
    print(f"  Epochs        : {PHASE1_EPOCHS}")
    print(f"  Learning rate : {PHASE1_LR}")
    print(f"  Weight decay  : {PHASE1_WEIGHT_DECAY}")
    print(f"  Loss function : CrossEntropyLoss")
    print("=" * 60)

    for epoch in range(PHASE1_EPOCHS):
        avg_loss = train_one_epoch(
            model, train_loader, criterion, optimiser, device, epoch
        )
        val_acc = evaluate(model, val_loader, device)
        print(
            f"Epoch {epoch+1}/{PHASE1_EPOCHS} — "
            f"train loss: {avg_loss:.4f} | val acc: {val_acc*100:.2f}%"
        )

    print("Phase 1 training complete.")


def save_model(model: nn.Module, path: str) -> None:
    """
    Persist model weights to disk.

    Exits with a non-zero exit code if the write fails, as required by
    Requirement 1.7.
    """
    try:
        torch.save(model.state_dict(), path)
        print(f"Model saved to {path}")
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: failed to save model to {path}: {exc}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Phase 2 hyper-parameters (added in task 4.3)
# ---------------------------------------------------------------------------
PHASE2_LR = PHASE1_LR / 10        # 1e-4 — must be exactly 1/10 of phase 1 LR
PHASE2_EPOCHS = 10                 # scheduled epochs for the cosine annealing run
ACCURACY_THRESHOLD = 0.85          # top-1 val accuracy required to pass
MAX_EXTRA_EPOCHS = 50              # maximum additional epochs after the scheduled run
EXTRA_EPOCH_INCREMENT = 5          # check accuracy every N extra epochs


def train_phase2(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    device: torch.device,
) -> None:
    """
    Phase 2 training: full fine-tuning with CosineAnnealingLR.

    Steps:
      1. Unfreeze all model parameters (phase transition).
      2. Create a new Adam optimiser at lr=1e-4 (= PHASE1_LR / 10).
      3. Attach CosineAnnealingLR for the scheduled 10-epoch run.
      4. Train for PHASE2_EPOCHS epochs, stepping the scheduler each epoch.
      5. Evaluate accuracy; if < ACCURACY_THRESHOLD continue in 5-epoch
         increments up to MAX_EXTRA_EPOCHS additional epochs.
      6. Exit with a non-zero code if threshold still not met after all retries.
    """

    # --- Phase transition: unfreeze ALL parameters -------------------------
    # After phase 1 only the head's parameters had requires_grad=True.
    # Setting requires_grad=True on every parameter enables gradients for the
    # entire network so the backbone can also be updated in phase 2.
    for param in model.parameters():
        param.requires_grad = True

    # --- New optimiser at reduced learning rate ----------------------------
    # All parameters are now trainable; we pass them all to Adam.
    # The learning rate is 1/10 of phase 1 to avoid destroying the features
    # learned during phase 1 (standard practice in two-phase fine-tuning).
    criterion = nn.CrossEntropyLoss()
    optimiser = torch.optim.Adam(
        model.parameters(),
        lr=PHASE2_LR,
        weight_decay=PHASE1_WEIGHT_DECAY,
    )

    # --- CosineAnnealingLR setup -------------------------------------------
    # CosineAnnealingLR smoothly decays the learning rate from PHASE2_LR down
    # to the minimum (eta_min=0 by default) following a cosine curve over
    # T_max epochs.  This avoids abrupt LR drops and helps the model settle
    # into a better minimum during the full-network fine-tuning stage.
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimiser, T_max=PHASE2_EPOCHS
    )

    print("=" * 60)
    print("Phase 2: full fine-tuning with CosineAnnealingLR")
    print(f"  Epochs            : {PHASE2_EPOCHS}")
    print(f"  Learning rate     : {PHASE2_LR}")
    print(f"  Weight decay      : {PHASE1_WEIGHT_DECAY}")
    print(f"  Scheduler         : CosineAnnealingLR (T_max={PHASE2_EPOCHS})")
    print(f"  Accuracy threshold: {ACCURACY_THRESHOLD * 100:.0f}%")
    print("=" * 60)

    # --- Scheduled training run (PHASE2_EPOCHS epochs) ---------------------
    for epoch in range(PHASE2_EPOCHS):
        avg_loss = train_one_epoch(
            model, train_loader, criterion, optimiser, device, epoch
        )
        # Step the cosine annealing scheduler after each epoch so the LR
        # follows the cosine curve across the full scheduled run.
        scheduler.step()

        val_acc = evaluate(model, val_loader, device)
        current_lr = scheduler.get_last_lr()[0]
        print(
            f"Epoch {epoch+1}/{PHASE2_EPOCHS} — "
            f"train loss: {avg_loss:.4f} | val acc: {val_acc*100:.2f}% "
            f"| lr: {current_lr:.2e}"
        )

    # --- Accuracy check after scheduled run --------------------------------
    # Evaluate top-1 accuracy on the validation set.  If we already meet the
    # threshold we are done; otherwise enter the retry loop below.
    val_acc = evaluate(model, val_loader, device)
    print(
        f"Phase 2 scheduled run complete. "
        f"Val accuracy: {val_acc*100:.2f}% "
        f"(threshold: {ACCURACY_THRESHOLD*100:.0f}%)"
    )

    if val_acc >= ACCURACY_THRESHOLD:
        print("Accuracy threshold met — phase 2 training complete.")
        return

    # --- Retry loop: continue in 5-epoch increments up to 50 extra epochs --
    # If the threshold was not met after the scheduled 10 epochs, keep
    # training in EXTRA_EPOCH_INCREMENT-sized blocks, re-checking accuracy
    # after each block, until we reach MAX_EXTRA_EPOCHS additional epochs.
    total_extra_epochs = 0
    while total_extra_epochs < MAX_EXTRA_EPOCHS:
        print(
            f"Accuracy {val_acc*100:.2f}% < threshold {ACCURACY_THRESHOLD*100:.0f}%. "
            f"Continuing for {EXTRA_EPOCH_INCREMENT} more epochs "
            f"({total_extra_epochs}/{MAX_EXTRA_EPOCHS} extra epochs used)."
        )

        for epoch in range(EXTRA_EPOCH_INCREMENT):
            # Train one epoch; cosine scheduler continues stepping so the LR
            # annealing extends beyond the original T_max window.
            global_epoch = PHASE2_EPOCHS + total_extra_epochs + epoch
            avg_loss = train_one_epoch(
                model, train_loader, criterion, optimiser, device, global_epoch
            )
            scheduler.step()

        total_extra_epochs += EXTRA_EPOCH_INCREMENT

        # Re-evaluate accuracy after this increment block.
        val_acc = evaluate(model, val_loader, device)
        print(
            f"Extra epoch check ({total_extra_epochs}/{MAX_EXTRA_EPOCHS}) — "
            f"val acc: {val_acc*100:.2f}%"
        )

        if val_acc >= ACCURACY_THRESHOLD:
            print(
                f"Accuracy threshold met after {total_extra_epochs} extra epochs "
                "— phase 2 training complete."
            )
            return

    # --- Threshold not met after all extra epochs — report failure ---------
    print(
        f"ERROR: accuracy threshold of {ACCURACY_THRESHOLD*100:.0f}% was not reached "
        f"after {PHASE2_EPOCHS} scheduled epochs + {MAX_EXTRA_EPOCHS} extra epochs. "
        f"Final val accuracy: {val_acc*100:.2f}%.",
        file=sys.stderr,
    )
    sys.exit(1)


def main() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    print("Loading Food-101 dataset …")
    train_loader, val_loader = get_dataloaders(DATA_DIR)

    print("Building model …")
    model = build_model()
    model.to(device)

    # Phase 1: train the head with the backbone frozen.
    train_phase1(model, train_loader, val_loader, device)

    # Phase 2: unfreeze all parameters and fine-tune with CosineAnnealingLR.
    # The phase-2 function handles the accuracy-threshold retry loop and
    # exits with a non-zero code if the threshold is not met.
    train_phase2(model, train_loader, val_loader, device)

    # Save the fully fine-tuned model weights.  save_model() exits non-zero
    # if the write fails (Requirement 1.7).
    save_model(model, MODEL_SAVE_PATH)


if __name__ == "__main__":
    main()
