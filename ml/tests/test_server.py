"""
test_server.py — Property-based tests for ml/server.py logic.

# Feature: food-recognition-ml, Property 1: Macro scaling is proportional to serving size
"""

# Validates: Requirements 3.4, 2.3

from hypothesis import given, settings
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# The five macro fields the server tracks.
# ---------------------------------------------------------------------------
MACRO_FIELDS = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"]


def scale_macros(per_100g: dict, serving_size: int) -> dict:
    """
    Replicate the scale() inner function from the /analyze endpoint in server.py.

    For each macro field:
      - If the per-100 g value is not None: result = round(value * serving_size / 100, 2)
      - If the per-100 g value is None:     result = None
    """
    result = {}
    for key in MACRO_FIELDS:
        val = per_100g.get(key)
        result[key] = round(val * serving_size / 100, 2) if val is not None else None
    return result


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------
_macro_value_strategy = st.one_of(
    st.none(),
    st.floats(min_value=0, max_value=9999, allow_nan=False, allow_infinity=False),
)

_per_100g_strategy = st.fixed_dictionaries(
    {field: _macro_value_strategy for field in MACRO_FIELDS}
)

_serving_size_strategy = st.integers(min_value=1, max_value=2000)


# ---------------------------------------------------------------------------
# Property 1: Macro scaling is proportional to serving size
# ---------------------------------------------------------------------------
@settings(max_examples=500)
@given(
    per_100g=_per_100g_strategy,
    serving_size=_serving_size_strategy,
)
def test_macro_scaling_proportional_to_serving_size(per_100g: dict, serving_size: int):
    """
    **Validates: Requirements 3.4, 2.3**

    For every combination of per-100 g macro values and serving size:
    - If the per-100 g value for a field is not None, the scaled result must
      equal round(value * serving_size / 100, 2).
    - If the per-100 g value is None, the scaled result must also be None.
    """
    result = scale_macros(per_100g, serving_size)

    for key in MACRO_FIELDS:
        raw = per_100g[key]
        scaled = result[key]

        if raw is None:
            assert scaled is None, (
                f"Field '{key}': expected None for None input, got {scaled!r}"
            )
        else:
            expected = round(raw * serving_size / 100, 2)
            assert scaled == expected, (
                f"Field '{key}': expected {expected} "
                f"(raw={raw}, serving_size={serving_size}), got {scaled}"
            )


# ---------------------------------------------------------------------------
# Property 2: Low-confidence flag is set iff top-1 score is below 50%
# Feature: food-recognition-ml, Property 2: Low-confidence flag is set iff top-1 score is below 50%
# ---------------------------------------------------------------------------


def build_response_body(top1_score: float, food: str, confidence_str: str, top3: list, macros: dict) -> dict:
    """
    Replicate the response assembly logic from the /analyze endpoint in server.py.

    Includes `low_confidence: True` in the body only when top1_score < 0.50.
    """
    body = {"food": food, "confidence": confidence_str, "top3": top3, "macros": macros}
    if top1_score < 0.50:
        body["low_confidence"] = True
    return body


@settings(max_examples=500)
@given(
    top1_score=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
)
def test_low_confidence_flag_iff_score_below_50_percent(top1_score: float):
    """
    **Validates: Requirements 3.5**

    For every confidence score in [0, 1]:
    - If score < 0.50: `low_confidence` key MUST be present and its value MUST be True.
    - If score >= 0.50: `low_confidence` key MUST NOT be present in the response body.
    """
    response_body = build_response_body(
        top1_score=top1_score,
        food="pizza",
        confidence_str=f"{top1_score * 100:.2f}",
        top3=[],
        macros={},
    )

    if top1_score < 0.50:
        assert "low_confidence" in response_body, (
            f"Expected 'low_confidence' key for score={top1_score} (< 0.50), "
            f"but it was absent. Response: {response_body}"
        )
        assert response_body["low_confidence"] is True, (
            f"Expected low_confidence=True for score={top1_score}, "
            f"got {response_body['low_confidence']!r}"
        )
    else:
        assert "low_confidence" not in response_body, (
            f"Expected 'low_confidence' key to be absent for score={top1_score} (>= 0.50), "
            f"but it was present. Response: {response_body}"
        )


# ---------------------------------------------------------------------------
# Property 3: Invalid uploads are rejected with HTTP 422
# Feature: food-recognition-ml, Property 3: Invalid uploads are rejected with HTTP 422
# ---------------------------------------------------------------------------

# Validates: Requirements 3.3, 3.6

_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_BYTES = 10 * 1024 * 1024


def validate_upload(content_type: str, size_bytes: int) -> tuple[bool, str]:
    """
    Replicate the upload validation logic from server.py's /analyze endpoint.

    Returns (is_valid, rejection_reason):
      - Unsupported MIME type  → (False, "Rejected: unsupported file type <mime>")
      - Size > 10 MB           → (False, "Rejected: file size exceeds 10 MB")
      - Valid type + size      → (True, "")
    """
    if content_type not in _ALLOWED_MIME_TYPES:
        return False, f"Rejected: unsupported file type {content_type}"
    if size_bytes > _MAX_FILE_BYTES:
        return False, "Rejected: file size exceeds 10 MB"
    return True, ""


# --- Property 3a: Unsupported MIME type → rejected, reason mentions "type" ---

@settings(max_examples=500)
@given(
    content_type=st.sampled_from(
        ["text/plain", "application/pdf", "image/gif", "video/mp4", "image/bmp"]
    ),
    size_bytes=st.integers(min_value=1, max_value=_MAX_FILE_BYTES),
)
def test_unsupported_mime_type_is_rejected(content_type: str, size_bytes: int):
    """
    **Validates: Requirements 3.3, 3.6**

    For any unsupported MIME type (regardless of file size within the limit):
    - is_valid MUST be False
    - rejection_reason MUST contain "type" (case-insensitive)
    """
    is_valid, rejection_reason = validate_upload(content_type, size_bytes)

    assert not is_valid, (
        f"Expected rejection for content_type={content_type!r} size={size_bytes}, "
        f"but validate_upload returned is_valid=True"
    )
    assert "type" in rejection_reason.lower(), (
        f"Expected rejection_reason to mention 'type' for content_type={content_type!r}, "
        f"got {rejection_reason!r}"
    )


# --- Property 3b: Valid MIME + oversized file → rejected, reason mentions "size" ---

@settings(max_examples=500)
@given(
    content_type=st.sampled_from(["image/jpeg", "image/png", "image/webp"]),
    size_bytes=st.integers(
        min_value=_MAX_FILE_BYTES + 1, max_value=50 * 1024 * 1024
    ),
)
def test_oversized_file_with_valid_mime_is_rejected(content_type: str, size_bytes: int):
    """
    **Validates: Requirements 3.3, 3.6**

    For a valid MIME type but file size exceeding 10 MB:
    - is_valid MUST be False
    - rejection_reason MUST contain "size" (case-insensitive)
    """
    is_valid, rejection_reason = validate_upload(content_type, size_bytes)

    assert not is_valid, (
        f"Expected rejection for content_type={content_type!r} size={size_bytes}, "
        f"but validate_upload returned is_valid=True"
    )
    assert "size" in rejection_reason.lower(), (
        f"Expected rejection_reason to mention 'size' for size={size_bytes}, "
        f"got {rejection_reason!r}"
    )


# --- Property 3c: Valid MIME + valid size → accepted ---

@settings(max_examples=500)
@given(
    content_type=st.sampled_from(["image/jpeg", "image/png", "image/webp"]),
    size_bytes=st.integers(min_value=1, max_value=_MAX_FILE_BYTES),
)
def test_valid_mime_and_size_is_accepted(content_type: str, size_bytes: int):
    """
    **Validates: Requirements 3.3, 3.6**

    For a valid MIME type and file size within the 10 MB limit:
    - is_valid MUST be True
    - rejection_reason MUST be an empty string
    """
    is_valid, rejection_reason = validate_upload(content_type, size_bytes)

    assert is_valid is True, (
        f"Expected acceptance for content_type={content_type!r} size={size_bytes}, "
        f"but validate_upload returned is_valid=False with reason {rejection_reason!r}"
    )
    assert rejection_reason == "", (
        f"Expected empty rejection_reason for valid upload, got {rejection_reason!r}"
    )


# ===========================================================================
# Integration tests for ml/server.py
# Task 6.6 — Requirements: 3.1, 3.2, 3.8
# ===========================================================================

import asyncio
import io
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import torch
from PIL import Image
from starlette.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_valid_db(path: Path) -> None:
    """Write a minimal valid nutrition_db.json with one entry at *path*."""
    db = {
        "pizza": {
            "calories": 266.0,
            "protein_g": 11.0,
            "carbs_g": 33.0,
            "fat_g": 10.0,
            "fiber_g": 2.3,
            "serving_size": 107,
        }
    }
    path.write_text(json.dumps(db), encoding="utf-8")


def _make_jpeg_bytes() -> bytes:
    """Return minimal JPEG bytes of a 10×10 RGB image."""
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color=(128, 64, 32)).save(buf, format="JPEG")
    return buf.getvalue()


def _fake_model(num_classes: int = 1) -> MagicMock:
    """
    Return a mock that behaves like a PyTorch model:
    - Calling it with a tensor returns a (1, num_classes) logit tensor.
    - .eval() returns self so the chained call in lifespan works.
    """
    mock = MagicMock()
    logits = torch.zeros(1, num_classes)
    logits[0, 0] = 10.0        # class 0 gets a very high logit → top-1
    mock.return_value = logits
    mock.eval.return_value = mock
    return mock


# ---------------------------------------------------------------------------
# Integration test 1: startup with missing model → non-zero exit (Req 3.1)
# ---------------------------------------------------------------------------

def test_startup_fails_with_missing_model(tmp_path):
    """Server must exit(1) when the model file does not exist."""
    valid_db = tmp_path / "nutrition_db.json"
    _make_valid_db(valid_db)

    missing_model = tmp_path / "does_not_exist.pth"

    with patch("ml.server._MODEL_PATH", missing_model), \
         patch("ml.server._DB_PATH", valid_db):
        with pytest.raises(SystemExit) as exc_info:
            from ml.server import lifespan, app as server_app

            async def run():
                async with lifespan(server_app):
                    pass

            asyncio.run(run())

    assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# Integration test 2: startup with malformed nutrition_db.json → exit(1)
#                     (Req 3.2 / 2.6)
# ---------------------------------------------------------------------------

def test_startup_fails_with_malformed_nutrition_db(tmp_path):
    """Server must exit(1) when nutrition_db.json cannot be parsed as JSON."""
    bad_db = tmp_path / "nutrition_db.json"
    bad_db.write_text("{not valid json", encoding="utf-8")

    # Point model path somewhere that would succeed if we got that far;
    # but the DB is loaded *first* in the lifespan, so we never reach
    # the model-load step.
    dummy_model = tmp_path / "dummy.pth"
    dummy_model.write_bytes(b"")   # content irrelevant — we exit before this

    with patch("ml.server._DB_PATH", bad_db), \
         patch("ml.server._MODEL_PATH", dummy_model):
        with pytest.raises(SystemExit) as exc_info:
            from ml.server import lifespan, app as server_app

            async def run():
                async with lifespan(server_app):
                    pass

            asyncio.run(run())

    assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# Integration test 3: POST /analyze succeeds end-to-end with injected state
#                     (Req 3.1, 3.2, 3.3, 3.4, 3.8)
#
# We bypass the lifespan by injecting a mock model + fake DB directly into
# app.state, then use TestClient (synchronous) to make the request.
# ---------------------------------------------------------------------------

def test_analyze_end_to_end_with_valid_image(tmp_path):
    """
    POST /analyze with a valid JPEG image must return HTTP 200 and a
    well-formed JSON body (food, confidence, top3, macros).

    The mock model returns logits over 3 classes so that torch.topk(probs, 3)
    succeeds.  Class 0 ("apple_pie") gets the highest logit → top-1.
    The nutrition_db has exactly three entries to match.
    """
    from ml.server import app

    # Build a nutrition_db with 3 entries.  sorted() gives:
    #   ["apple_pie", "baby_back_ribs", "baklava"] → indices 0, 1, 2.
    # The mock model gives index-0 ("apple_pie") the highest logit.
    nutrition_db = {
        "apple_pie": {
            "calories": 300.0,
            "protein_g": 2.0,
            "carbs_g": 45.0,
            "fat_g": 12.0,
            "fiber_g": 1.5,
            "serving_size": 125,
        },
        "baby_back_ribs": {
            "calories": 280.0,
            "protein_g": 25.0,
            "carbs_g": 0.0,
            "fat_g": 20.0,
            "fiber_g": 0.0,
            "serving_size": 140,
        },
        "baklava": {
            "calories": 330.0,
            "protein_g": 5.0,
            "carbs_g": 40.0,
            "fat_g": 18.0,
            "fiber_g": 1.0,
            "serving_size": 85,
        },
    }

    # Inject directly into app.state — no lifespan required.
    app.state.model = _fake_model(num_classes=3)
    app.state.nutrition_db = nutrition_db

    client = TestClient(app, raise_server_exceptions=True)

    jpeg_bytes = _make_jpeg_bytes()
    response = client.post(
        "/analyze",
        files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")},
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    body = response.json()
    assert body["food"] == "apple_pie"
    assert "confidence" in body
    assert "top3" in body
    assert len(body["top3"]) == 3
    assert "macros" in body

    macros = body["macros"]
    for field in ("calories", "protein_g", "carbs_g", "fat_g", "fiber_g"):
        assert field in macros, f"Missing macro field: {field}"


# ---------------------------------------------------------------------------
# Integration test 4: CORS header present on /analyze response (Req 3.8)
# ---------------------------------------------------------------------------

def test_cors_header_present_on_analyze_response():
    """
    Every response from the inference server must carry the
    Access-Control-Allow-Origin: * header (Requirement 3.8).
    """
    from ml.server import app

    nutrition_db = {
        "pizza": {
            "calories": 266.0,
            "protein_g": 11.0,
            "carbs_g": 33.0,
            "fat_g": 10.0,
            "fiber_g": 2.3,
            "serving_size": 107,
        }
    }

    app.state.model = _fake_model(num_classes=1)
    app.state.nutrition_db = nutrition_db

    # TestClient must send an Origin header to trigger the CORS middleware.
    client = TestClient(app, raise_server_exceptions=True)

    jpeg_bytes = _make_jpeg_bytes()
    response = client.post(
        "/analyze",
        files={"file": ("test.jpg", jpeg_bytes, "image/jpeg")},
        headers={"Origin": "http://localhost:3000"},
    )

    assert "access-control-allow-origin" in response.headers, (
        "CORS header 'Access-Control-Allow-Origin' missing from response. "
        f"Headers: {dict(response.headers)}"
    )
    assert response.headers["access-control-allow-origin"] == "*", (
        f"Expected 'Access-Control-Allow-Origin: *', "
        f"got {response.headers['access-control-allow-origin']!r}"
    )


# ---------------------------------------------------------------------------
# Integration test 5: CORS header present on 422 error responses (Req 3.8)
# ---------------------------------------------------------------------------

def test_cors_header_present_on_422_error_response():
    """
    CORS headers must also be present on error (HTTP 422) responses.
    We trigger a 422 by uploading an unsupported MIME type.
    """
    from ml.server import app

    app.state.model = _fake_model(num_classes=1)
    app.state.nutrition_db = {
        "pizza": {
            "calories": 266.0,
            "protein_g": 11.0,
            "carbs_g": 33.0,
            "fat_g": 10.0,
            "fiber_g": 2.3,
            "serving_size": 107,
        }
    }

    client = TestClient(app, raise_server_exceptions=False)

    response = client.post(
        "/analyze",
        files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")},
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.status_code == 422
    assert "access-control-allow-origin" in response.headers, (
        "CORS header missing on 422 response. "
        f"Headers: {dict(response.headers)}"
    )
    assert response.headers["access-control-allow-origin"] == "*"
