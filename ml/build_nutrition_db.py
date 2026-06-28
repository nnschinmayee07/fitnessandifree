#!/usr/bin/env python3
"""
build_nutrition_db.py

Queries the USDA FoodData Central API for each of the 101 Food-101 category
labels and writes ml/nutrition_db.json.

Usage:
    USDA_API_KEY=<your_key> python ml/build_nutrition_db.py

Environment variables:
    USDA_API_KEY  – required; your USDA FoodData Central API key

Exit codes:
    0  – success (all categories have at least one non-null macro field)
    1  – one or more categories have ALL five macro fields set to null
"""

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# USDA nutrient ID → nutrition_db.json field name
# ---------------------------------------------------------------------------
NUTRIENT_MAP: dict[int, str] = {
    1008: "calories",    # Energy (kcal)
    1003: "protein_g",   # Protein
    1005: "carbs_g",     # Carbohydrate, by difference
    1004: "fat_g",       # Total lipid (fat)
    1079: "fiber_g",     # Fiber, total dietary
}

# ---------------------------------------------------------------------------
# All 101 Food-101 class labels (standard dataset order)
# ---------------------------------------------------------------------------
FOOD_101_LABELS: list[str] = [
    "apple_pie",
    "baby_back_ribs",
    "baklava",
    "beef_carpaccio",
    "beef_tartare",
    "beet_salad",
    "beignets",
    "bibimbap",
    "bread_pudding",
    "breakfast_burrito",
    "bruschetta",
    "caesar_salad",
    "cannoli",
    "caprese_salad",
    "carrot_cake",
    "ceviche",
    "cheesecake",
    "cheese_plate",
    "chicken_curry",
    "chicken_quesadilla",
    "chicken_wings",
    "chocolate_cake",
    "chocolate_mousse",
    "churros",
    "clam_chowder",
    "club_sandwich",
    "crab_cakes",
    "creme_brulee",
    "croque_madame",
    "cup_cakes",
    "deviled_eggs",
    "donuts",
    "dumplings",
    "edamame",
    "eggs_benedict",
    "escargots",
    "falafel",
    "filet_mignon",
    "fish_and_chips",
    "foie_gras",
    "french_fries",
    "french_onion_soup",
    "french_toast",
    "fried_calamari",
    "fried_rice",
    "frozen_yogurt",
    "garlic_bread",
    "gnocchi",
    "greek_salad",
    "grilled_cheese_sandwich",
    "grilled_salmon",
    "guacamole",
    "gyoza",
    "hamburger",
    "hot_and_sour_soup",
    "hot_dog",
    "huevos_rancheros",
    "hummus",
    "ice_cream",
    "lasagna",
    "lobster_bisque",
    "lobster_roll_sandwich",
    "macaroni_and_cheese",
    "macarons",
    "miso_soup",
    "mussels",
    "nachos",
    "omelette",
    "onion_rings",
    "oysters",
    "pad_thai",
    "paella",
    "pancakes",
    "panna_cotta",
    "peking_duck",
    "pho",
    "pizza",
    "pork_chop",
    "poutine",
    "prime_rib",
    "pulled_pork_sandwich",
    "ramen",
    "ravioli",
    "red_velvet_cake",
    "risotto",
    "samosa",
    "sashimi",
    "scallops",
    "seaweed_salad",
    "shrimp_and_grits",
    "spaghetti_bolognese",
    "spaghetti_carbonara",
    "spring_rolls",
    "steak",
    "strawberry_shortcake",
    "sushi",
    "tacos",
    "takoyaki",
    "tiramisu",
    "tuna_tartare",
    "waffles",
]

assert len(FOOD_101_LABELS) == 101, f"Expected 101 labels, got {len(FOOD_101_LABELS)}"

# ---------------------------------------------------------------------------
# Fixed serving sizes (grams) — one reasonable default per category.
# Values are positive integers in [1, 2000].
# ---------------------------------------------------------------------------
SERVING_SIZES: dict[str, int] = {
    "apple_pie": 125,
    "baby_back_ribs": 200,
    "baklava": 78,
    "beef_carpaccio": 85,
    "beef_tartare": 100,
    "beet_salad": 150,
    "beignets": 75,
    "bibimbap": 490,
    "bread_pudding": 170,
    "breakfast_burrito": 220,
    "bruschetta": 100,
    "caesar_salad": 180,
    "cannoli": 85,
    "caprese_salad": 150,
    "carrot_cake": 111,
    "ceviche": 150,
    "cheesecake": 125,
    "cheese_plate": 100,
    "chicken_curry": 300,
    "chicken_quesadilla": 190,
    "chicken_wings": 160,
    "chocolate_cake": 100,
    "chocolate_mousse": 120,
    "churros": 90,
    "clam_chowder": 245,
    "club_sandwich": 250,
    "crab_cakes": 130,
    "creme_brulee": 150,
    "croque_madame": 200,
    "cup_cakes": 63,
    "deviled_eggs": 60,
    "donuts": 60,
    "dumplings": 140,
    "edamame": 100,
    "eggs_benedict": 230,
    "escargots": 100,
    "falafel": 140,
    "filet_mignon": 227,
    "fish_and_chips": 400,
    "foie_gras": 80,
    "french_fries": 154,
    "french_onion_soup": 300,
    "french_toast": 135,
    "fried_calamari": 120,
    "fried_rice": 300,
    "frozen_yogurt": 174,
    "garlic_bread": 60,
    "gnocchi": 200,
    "greek_salad": 200,
    "grilled_cheese_sandwich": 150,
    "grilled_salmon": 178,
    "guacamole": 100,
    "gyoza": 150,
    "hamburger": 220,
    "hot_and_sour_soup": 244,
    "hot_dog": 120,
    "huevos_rancheros": 300,
    "hummus": 100,
    "ice_cream": 132,
    "lasagna": 280,
    "lobster_bisque": 245,
    "lobster_roll_sandwich": 200,
    "macaroni_and_cheese": 280,
    "macarons": 40,
    "miso_soup": 240,
    "mussels": 200,
    "nachos": 170,
    "omelette": 180,
    "onion_rings": 120,
    "oysters": 100,
    "pad_thai": 300,
    "paella": 350,
    "pancakes": 230,
    "panna_cotta": 130,
    "peking_duck": 200,
    "pho": 500,
    "pizza": 107,
    "pork_chop": 220,
    "poutine": 400,
    "prime_rib": 255,
    "pulled_pork_sandwich": 250,
    "ramen": 500,
    "ravioli": 250,
    "red_velvet_cake": 111,
    "risotto": 300,
    "samosa": 120,
    "sashimi": 100,
    "scallops": 150,
    "seaweed_salad": 100,
    "shrimp_and_grits": 300,
    "spaghetti_bolognese": 350,
    "spaghetti_carbonara": 300,
    "spring_rolls": 130,
    "steak": 227,
    "strawberry_shortcake": 135,
    "sushi": 200,
    "tacos": 170,
    "takoyaki": 150,
    "tiramisu": 115,
    "tuna_tartare": 100,
    "waffles": 210,
}

assert set(SERVING_SIZES.keys()) == set(FOOD_101_LABELS), (
    "SERVING_SIZES keys must match FOOD_101_LABELS exactly"
)
for label, size in SERVING_SIZES.items():
    assert isinstance(size, int) and 1 <= size <= 2000, (
        f"Serving size for '{label}' ({size}) must be an integer in [1, 2000]"
    )

# ---------------------------------------------------------------------------
# USDA FoodData Central API helpers
# ---------------------------------------------------------------------------
USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2.0  # base delay between attempts


def _search_food(query: str, api_key: str) -> Optional[dict]:
    """
    Search the USDA FoodData Central API for a food item.
    Returns the first result's fdcId and nutrient list, or None on failure.
    """
    url = f"{USDA_BASE_URL}/foods/search"
    params = {
        "query": query.replace("_", " "),
        "dataType": ["SR Legacy", "Foundation"],
        "pageSize": 1,
        "api_key": api_key,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    foods = data.get("foods", [])
    if not foods:
        return None
    return foods[0]


def _extract_macros(food_item: dict) -> dict[str, Optional[float]]:
    """
    Extract the five macro fields from a USDA food search result.
    Returns a dict with all five keys; values are float or None.
    """
    # food_item from /foods/search has a 'foodNutrients' list
    nutrients_raw = food_item.get("foodNutrients", [])

    # Build a lookup: nutrient_id → value
    nutrient_values: dict[int, float] = {}
    for n in nutrients_raw:
        nid = n.get("nutrientId")
        val = n.get("value")
        if nid is not None and val is not None:
            nutrient_values[int(nid)] = float(val)

    macros: dict[str, Optional[float]] = {}
    for nid, field in NUTRIENT_MAP.items():
        macros[field] = nutrient_values.get(nid)  # None if not found

    return macros


def fetch_macros_with_retry(label: str, api_key: str) -> dict[str, Optional[float]]:
    """
    Attempt to fetch per-100 g macros for *label* from USDA, retrying up to
    MAX_RETRIES times.  On exhaustion returns a dict with all five fields = None
    and logs a warning.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("Querying USDA for '%s' (attempt %d/%d)", label, attempt, MAX_RETRIES)
            food_item = _search_food(label, api_key)
            if food_item is None:
                logger.warning("No USDA results for '%s' on attempt %d", label, attempt)
                last_exc = ValueError(f"No results returned for '{label}'")
            else:
                macros = _extract_macros(food_item)
                logger.info("Retrieved macros for '%s': %s", label, macros)
                return macros
        except requests.RequestException as exc:
            logger.warning("HTTP error for '%s' on attempt %d: %s", label, attempt, exc)
            last_exc = exc

        if attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY_SECONDS)

    # All retries exhausted
    logger.warning(
        "All %d retries exhausted for '%s' (%s). Recording null entry.",
        MAX_RETRIES,
        label,
        last_exc,
    )
    return {field: None for field in NUTRIENT_MAP.values()}


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def build_nutrition_db(api_key: str) -> dict:
    """
    Query USDA for every Food-101 label and assemble the nutrition database.
    Returns the full database dict (keyed by label).
    """
    db: dict = {}

    for label in FOOD_101_LABELS:
        macros = fetch_macros_with_retry(label, api_key)

        # Guarantee all five macro keys are always present (never omitted)
        entry: dict = {
            "calories":    macros.get("calories"),
            "protein_g":   macros.get("protein_g"),
            "carbs_g":     macros.get("carbs_g"),
            "fat_g":       macros.get("fat_g"),
            "fiber_g":     macros.get("fiber_g"),
            "serving_size": SERVING_SIZES[label],
        }
        db[label] = entry

    return db


def validate_and_exit(db: dict) -> None:
    """
    Check whether any category has ALL five macro fields set to null.
    Logs the offending names and exits with code 1 if any are found.
    """
    macro_fields = list(NUTRIENT_MAP.values())  # the five field names
    all_null_categories = [
        label
        for label, entry in db.items()
        if all(entry.get(field) is None for field in macro_fields)
    ]

    if all_null_categories:
        logger.error(
            "The following %d categories have ALL five macro fields set to null. "
            "Manual intervention required before shipping nutrition_db.json:\n  %s",
            len(all_null_categories),
            "\n  ".join(all_null_categories),
        )
        sys.exit(1)

    logger.info("Validation passed: no category has all five macro fields null.")


def main() -> None:
    api_key = os.environ.get("USDA_API_KEY")
    if not api_key:
        logger.error(
            "USDA_API_KEY environment variable is not set. "
            "Obtain a free key at https://fdc.nal.usda.gov/api-key-signup.html"
        )
        sys.exit(1)

    logger.info("Starting nutrition DB build for %d Food-101 labels.", len(FOOD_101_LABELS))

    db = build_nutrition_db(api_key)

    # Write output file
    output_path = Path(__file__).parent / "nutrition_db.json"
    output_path.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Wrote nutrition_db.json to '%s'.", output_path)

    # Validate — exits non-zero if any category is fully null
    validate_and_exit(db)

    logger.info("Done. nutrition_db.json contains %d entries.", len(db))


if __name__ == "__main__":
    main()
