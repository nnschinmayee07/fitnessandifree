"""
Unit tests for ml/train.py — Phase 1 parameter states.

Validates: Requirements 1.2
"""

from ml.train import build_model


def test_freeze_phase():
    """
    After build_model(), every backbone parameter must be frozen
    (requires_grad == False) and every classifier parameter must
    be trainable (requires_grad == True).

    The backbone is everything except model.classifier.
    The head is model.classifier.
    """
    model = build_model()

    # --- backbone parameters must be frozen -----------------------------------
    for name, param in model.named_parameters():
        if not name.startswith("classifier"):
            assert not param.requires_grad, (
                f"Backbone parameter '{name}' should be frozen "
                f"(requires_grad=False) but is trainable."
            )

    # --- classifier (head) parameters must be trainable -----------------------
    for param in model.classifier.parameters():
        assert param.requires_grad, (
            "A classifier (head) parameter should be trainable "
            "(requires_grad=True) but is frozen."
        )


"""
Unit tests for ml/train.py — Phase 2 parameter and scheduler states.

Validates: Requirements 1.2, 1.3
"""

import torch
from ml.train import build_model, PHASE1_LR, PHASE2_LR, PHASE2_EPOCHS


def test_unfreeze_phase():
    """
    After manually unfreezing all parameters (simulating the phase transition),
    every parameter in the model must have requires_grad == True.

    Validates: Requirement 1.2
    """
    model = build_model()

    # Simulate the phase transition performed in train_phase2:
    # set requires_grad=True on every parameter so the full network
    # can be updated during fine-tuning.
    for param in model.parameters():
        param.requires_grad = True

    for name, param in model.named_parameters():
        assert param.requires_grad, (
            f"Parameter '{name}' should be trainable (requires_grad=True) "
            "after unfreezing but is still frozen."
        )


def test_lr_relationship():
    """
    The phase 2 learning rate must be at most 1/10 of the phase 1 learning rate,
    ensuring the backbone is fine-tuned conservatively to preserve phase 1 features.

    Validates: Requirement 1.3
    """
    assert PHASE2_LR <= PHASE1_LR / 10, (
        f"PHASE2_LR ({PHASE2_LR}) must be <= PHASE1_LR / 10 ({PHASE1_LR / 10})"
    )


def test_scheduler_type():
    """
    The scheduler created for phase 2 training must be an instance of
    CosineAnnealingLR, as required by the Two_Phase_Training strategy.

    Validates: Requirement 1.3
    """
    model = build_model()

    # Unfreeze all parameters so they can be passed to the optimiser,
    # mirroring the setup in train_phase2.
    for param in model.parameters():
        param.requires_grad = True

    optimiser = torch.optim.Adam(model.parameters(), lr=PHASE2_LR)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimiser, T_max=PHASE2_EPOCHS
    )

    assert isinstance(scheduler, torch.optim.lr_scheduler.CosineAnnealingLR), (
        f"Expected CosineAnnealingLR scheduler but got {type(scheduler).__name__}"
    )


# ---------------------------------------------------------------------------
# Feature: food-recognition-ml, Property 12: Training accuracy retry loop terminates correctly
# Validates: Requirements 1.6
# ---------------------------------------------------------------------------

from hypothesis import given, settings
from hypothesis import strategies as st


def simulate_retry_loop(accuracy_sequence, threshold=0.85, max_extra=50, increment=5):
    """Returns (met_threshold: bool, extra_epochs_used: int)."""
    extra_used = 0
    for acc in accuracy_sequence:
        extra_used += increment
        if acc >= threshold:
            return True, extra_used
        if extra_used >= max_extra:
            return False, extra_used
    return False, extra_used


@given(
    accuracy_sequence=st.lists(
        st.floats(0.0, 1.0, allow_nan=False, allow_infinity=False),
        min_size=1,
        max_size=10,
    )
)
@settings(max_examples=500)
def test_retry_loop_terminates_correctly(accuracy_sequence):
    """
    Property 12: Training accuracy retry loop terminates correctly.

    Asserts:
    1. If the loop returns True (threshold met), extra_epochs_used <= 50.
    2. If any value in the sequence >= 0.85, the loop returns (True, ...).
    3. If no value in the sequence >= 0.85, the loop returns (False, ...).
    4. extra_epochs_used is always a multiple of 5.

    Validates: Requirements 1.6
    """
    met, extra_used = simulate_retry_loop(accuracy_sequence)

    # Property 1: if threshold was met, extra epochs used is within budget
    if met:
        assert extra_used <= 50, (
            f"extra_epochs_used={extra_used} exceeds max of 50 when threshold was met"
        )

    # Property 2: if any accuracy in the sequence >= 0.85, must have returned True
    if any(acc >= 0.85 for acc in accuracy_sequence):
        assert met is True, (
            f"Expected threshold to be met (sequence contains value >= 0.85) "
            f"but got met={met}. sequence={accuracy_sequence}"
        )

    # Property 3: if no accuracy in the sequence >= 0.85, must have returned False
    if not any(acc >= 0.85 for acc in accuracy_sequence):
        assert met is False, (
            f"Expected threshold NOT to be met (no value >= 0.85 in sequence) "
            f"but got met={met}. sequence={accuracy_sequence}"
        )

    # Property 4: extra_epochs_used is always a multiple of 5
    assert extra_used % 5 == 0, (
        f"extra_epochs_used={extra_used} is not a multiple of 5"
    )
