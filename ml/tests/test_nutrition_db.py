"""
Unit tests for build_nutrition_db.py

Covers:
  - test_retry_logic     (Requirement 2.1)
  - test_nutrition_db_all_null_exit  (Requirement 2.7)
"""

import sys
from unittest.mock import patch, MagicMock, call
import pytest
import requests

# The module under test
import ml.build_nutrition_db as bnd
from ml.build_nutrition_db import fetch_macros_with_retry, validate_and_exit, MAX_RETRIES

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_food_item() -> dict:
    """Return a minimal USDA-style food item with all five macros present."""
    return {
        "fdcId": 123456,
        "foodNutrients": [
            {"nutrientId": 1008, "value": 250.0},  # calories
            {"nutrientId": 1003, "value": 10.0},   # protein_g
            {"nutrientId": 1005, "value": 30.0},   # carbs_g
            {"nutrientId": 1004, "value": 8.0},    # fat_g
            {"nutrientId": 1079, "value": 2.0},    # fiber_g
        ],
    }


def _make_all_null_db_entry() -> dict:
    """Return a DB entry where all five macro fields are None."""
    return {
        "calories":    None,
        "protein_g":   None,
        "carbs_g":     None,
        "fat_g":       None,
        "fiber_g":     None,
        "serving_size": 100,
    }


def _make_valid_db_entry() -> dict:
    """Return a DB entry with real macro values."""
    return {
        "calories":    250.0,
        "protein_g":  10.0,
        "carbs_g":    30.0,
        "fat_g":       8.0,
        "fiber_g":     2.0,
        "serving_size": 100,
    }


# ---------------------------------------------------------------------------
# test_retry_logic
# ---------------------------------------------------------------------------

class TestRetryLogic:
    """
    Validates Requirement 2.1:
    The script SHALL retry up to 3 times on USDA API errors before
    logging a warning and recording a null entry.
    """

    @patch("ml.build_nutrition_db._search_food")
    @patch("ml.build_nutrition_db.time.sleep", return_value=None)  # skip real delays
    def test_no_failures_calls_once(self, mock_sleep, mock_search):
        """0 failures → _search_food called exactly once, returns valid macros."""
        mock_search.return_value = _make_food_item()

        macros = fetch_macros_with_retry("pizza", "fake_key")

        assert mock_search.call_count == 1
        assert macros["calories"] == 250.0

    @patch("ml.build_nutrition_db._search_food")
    @patch("ml.build_nutrition_db.time.sleep", return_value=None)
    def test_one_failure_calls_twice(self, mock_sleep, mock_search):
        """1 failure → _search_food called exactly 2 times, returns valid macros."""
        mock_search.side_effect = [
            requests.RequestException("transient error"),
            _make_food_item(),
        ]

        macros = fetch_macros_with_retry("pizza", "fake_key")

        assert mock_search.call_count == 2
        assert macros["calories"] == 250.0

    @patch("ml.build_nutrition_db._search_food")
    @patch("ml.build_nutrition_db.time.sleep", return_value=None)
    def test_two_failures_calls_three_times(self, mock_sleep, mock_search):
        """2 failures → _search_food called exactly 3 times, returns valid macros."""
        mock_search.side_effect = [
            requests.RequestException("error 1"),
            requests.RequestException("error 2"),
            _make_food_item(),
        ]

        macros = fetch_macros_with_retry("pizza", "fake_key")

        assert mock_search.call_count == 3
        assert macros["calories"] == 250.0

    @patch("ml.build_nutrition_db._search_food")
    @patch("ml.build_nutrition_db.time.sleep", return_value=None)
    def test_three_failures_exhausts_retries_and_returns_null(self, mock_sleep, mock_search):
        """
        3 consecutive failures (== MAX_RETRIES) → _search_food called exactly
        MAX_RETRIES times, all macro fields are None (null entry recorded).
        """
        mock_search.side_effect = [
            requests.RequestException("error 1"),
            requests.RequestException("error 2"),
            requests.RequestException("error 3"),
        ]

        macros = fetch_macros_with_retry("pizza", "fake_key")

        assert mock_search.call_count == MAX_RETRIES
        assert all(v is None for v in macros.values())


# ---------------------------------------------------------------------------
# test_nutrition_db_all_null_exit
# ---------------------------------------------------------------------------

class TestNutritionDbAllNullExit:
    """
    Validates Requirement 2.7:
    If any Food-101 category has ALL five macro fields set to null,
    the script SHALL exit with a non-zero exit code.
    """

    def test_all_valid_entries_no_exit(self):
        """DB with all valid entries → validate_and_exit does NOT call sys.exit."""
        db = {label: _make_valid_db_entry() for label in ["pizza", "sushi", "tacos"]}

        # Should return normally without raising SystemExit
        validate_and_exit(db)  # no assertion needed; absence of exception is the test

    def test_single_all_null_entry_exits_with_code_1(self):
        """DB with one fully-null entry → sys.exit(1) is called."""
        db = {
            "pizza": _make_valid_db_entry(),
            "sushi": _make_all_null_db_entry(),   # all nulls → should trigger exit
            "tacos": _make_valid_db_entry(),
        }

        with pytest.raises(SystemExit) as exc_info:
            validate_and_exit(db)

        assert exc_info.value.code == 1

    def test_all_null_entries_exits_with_code_1(self):
        """DB where every entry is fully-null → sys.exit(1) is still called."""
        db = {label: _make_all_null_db_entry() for label in ["pizza", "sushi", "tacos"]}

        with pytest.raises(SystemExit) as exc_info:
            validate_and_exit(db)

        assert exc_info.value.code == 1

    def test_partial_null_entry_does_not_exit(self):
        """
        An entry with some (but not all) macro fields null is acceptable —
        only ALL-five-null triggers exit.
        """
        partial_null_entry = {
            "calories":  None,    # null
            "protein_g": 10.0,    # present
            "carbs_g":   30.0,
            "fat_g":      8.0,
            "fiber_g":    2.0,
            "serving_size": 100,
        }
        db = {"pizza": partial_null_entry}

        # Should NOT raise SystemExit
        validate_and_exit(db)


# ---------------------------------------------------------------------------
# Property 11: Nutrition DB entries always contain all macro keys
# ---------------------------------------------------------------------------

from hypothesis import given, settings
from hypothesis import strategies as st

MACRO_KEYS = {"calories", "protein_g", "carbs_g", "fat_g", "fiber_g"}

# Strategy: generate a macros dict that fetch_macros_with_retry could return.
# All five keys are present; each value is either None or a non-negative float.
_macro_value = st.one_of(
    st.none(),
    st.floats(min_value=0.0, max_value=10_000.0, allow_nan=False, allow_infinity=False),
)

_macros_dict = st.fixed_dictionaries(
    {
        "calories":  _macro_value,
        "protein_g": _macro_value,
        "carbs_g":   _macro_value,
        "fat_g":     _macro_value,
        "fiber_g":   _macro_value,
    }
)


@given(macros=_macros_dict)
@settings(max_examples=200)
def test_nutrition_db_entry_always_has_all_macro_keys(macros):
    # Feature: food-recognition-ml, Property 11: Nutrition DB entries always contain all macro keys
    # **Validates: Requirements 2.2**
    #
    # For ANY combination of macro values returned by fetch_macros_with_retry
    # (including all-None), every entry produced by build_nutrition_db must
    # contain all five macro keys — keys must never be omitted.
    with patch("ml.build_nutrition_db.fetch_macros_with_retry", return_value=macros):
        db = bnd.build_nutrition_db(api_key="test-key")

    for label in bnd.FOOD_101_LABELS:
        assert label in db, f"Label '{label}' missing from DB"
        entry = db[label]
        missing = MACRO_KEYS - entry.keys()
        assert not missing, (
            f"Entry for '{label}' is missing macro keys: {missing}. "
            f"Entry keys present: {set(entry.keys())}"
        )
