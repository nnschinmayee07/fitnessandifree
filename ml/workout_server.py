"""
workout_server.py — FastAPI server for workout recommendations.

Provides /workout/recommend endpoint for generating personalized workout plans.

Usage:
    uvicorn ml.workout_server:app --host 0.0.0.0 --port 8001
"""

import logging
from datetime import datetime
from typing import List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(title="Workout Recommendation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class WorkoutRequest(BaseModel):
    user_id: str
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class Exercise(BaseModel):
    exercise_id: str
    exercise_name: str
    muscle_group: str
    target_sets: int
    target_reps: int
    suggested_weight_kg: float
    rest_seconds: int
    rationale: str


class PlanMetadata(BaseModel):
    total_exercises: int
    estimated_duration_minutes: int
    focus_areas: List[str]


class WorkoutResponse(BaseModel):
    workout_type: str
    recommended_exercises: List[Exercise]
    plan_metadata: PlanMetadata


# ---------------------------------------------------------------------------
# Exercise Database (Simple Mock Data)
# ---------------------------------------------------------------------------

# Exercise templates with IDs matching your exercise library
EXERCISE_TEMPLATES = {
    "chest": [
        {
            "exercise_id": "00000000-0000-0000-0000-000000000001",
            "exercise_name": "bench_press",
            "muscle_group": "chest",
            "target_sets": 4,
            "target_reps": 8,
            "suggested_weight_kg": 60.0,
            "rest_seconds": 120,
            "rationale": "Compound movement for chest strength and size"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000002",
            "exercise_name": "incline_dumbbell_press",
            "muscle_group": "chest",
            "target_sets": 3,
            "target_reps": 10,
            "suggested_weight_kg": 25.0,
            "rest_seconds": 90,
            "rationale": "Targets upper chest fibers"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000003",
            "exercise_name": "chest_fly",
            "muscle_group": "chest",
            "target_sets": 3,
            "target_reps": 12,
            "suggested_weight_kg": 15.0,
            "rest_seconds": 60,
            "rationale": "Isolation movement for chest stretch and contraction"
        }
    ],
    "back": [
        {
            "exercise_id": "00000000-0000-0000-0000-000000000004",
            "exercise_name": "deadlift",
            "muscle_group": "back",
            "target_sets": 4,
            "target_reps": 6,
            "suggested_weight_kg": 100.0,
            "rest_seconds": 180,
            "rationale": "King of compound exercises for overall back development"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000005",
            "exercise_name": "pull_up",
            "muscle_group": "back",
            "target_sets": 4,
            "target_reps": 8,
            "suggested_weight_kg": 0.0,
            "rest_seconds": 120,
            "rationale": "Bodyweight exercise for lat width"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000006",
            "exercise_name": "barbell_row",
            "muscle_group": "back",
            "target_sets": 4,
            "target_reps": 10,
            "suggested_weight_kg": 70.0,
            "rest_seconds": 90,
            "rationale": "Builds back thickness and strength"
        }
    ],
    "legs": [
        {
            "exercise_id": "00000000-0000-0000-0000-000000000007",
            "exercise_name": "squat",
            "muscle_group": "legs",
            "target_sets": 4,
            "target_reps": 8,
            "suggested_weight_kg": 80.0,
            "rest_seconds": 150,
            "rationale": "Fundamental compound movement for leg development"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000008",
            "exercise_name": "leg_press",
            "muscle_group": "legs",
            "target_sets": 3,
            "target_reps": 12,
            "suggested_weight_kg": 120.0,
            "rest_seconds": 90,
            "rationale": "Targets quads with reduced spinal load"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-000000000009",
            "exercise_name": "leg_curl",
            "muscle_group": "legs",
            "target_sets": 3,
            "target_reps": 12,
            "suggested_weight_kg": 40.0,
            "rest_seconds": 60,
            "rationale": "Isolates hamstrings for balanced leg development"
        }
    ],
    "shoulders": [
        {
            "exercise_id": "00000000-0000-0000-0000-00000000000a",
            "exercise_name": "overhead_press",
            "muscle_group": "shoulders",
            "target_sets": 4,
            "target_reps": 8,
            "suggested_weight_kg": 40.0,
            "rest_seconds": 120,
            "rationale": "Primary compound movement for shoulder development"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-00000000000b",
            "exercise_name": "lateral_raise",
            "muscle_group": "shoulders",
            "target_sets": 3,
            "target_reps": 12,
            "suggested_weight_kg": 10.0,
            "rest_seconds": 60,
            "rationale": "Isolation for lateral deltoid width"
        }
    ],
    "arms": [
        {
            "exercise_id": "00000000-0000-0000-0000-00000000000c",
            "exercise_name": "barbell_curl",
            "muscle_group": "arms",
            "target_sets": 3,
            "target_reps": 10,
            "suggested_weight_kg": 30.0,
            "rest_seconds": 60,
            "rationale": "Primary bicep mass builder"
        },
        {
            "exercise_id": "00000000-0000-0000-0000-00000000000d",
            "exercise_name": "tricep_dip",
            "muscle_group": "arms",
            "target_sets": 3,
            "target_reps": 10,
            "suggested_weight_kg": 0.0,
            "rest_seconds": 60,
            "rationale": "Compound movement for tricep development"
        }
    ]
}

# Training split: PPL (Push-Pull-Legs) with rest on Sunday
SPLIT_SCHEDULE = {
    0: {"type": "push", "muscles": ["chest", "shoulders"], "name": "Push"},      # Monday
    1: {"type": "pull", "muscles": ["back"], "name": "Pull"},                    # Tuesday
    2: {"type": "legs", "muscles": ["legs"], "name": "Legs"},                    # Wednesday
    3: {"type": "push", "muscles": ["chest", "shoulders"], "name": "Push"},      # Thursday
    4: {"type": "pull", "muscles": ["back"], "name": "Pull"},                    # Friday
    5: {"type": "legs", "muscles": ["legs"], "name": "Legs"},                    # Saturday
    6: {"type": "rest", "muscles": [], "name": "Rest"}                           # Sunday
}


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def get_day_of_week(date_str: str) -> int:
    """Get day of week (0=Monday, 6=Sunday) from YYYY-MM-DD string."""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.weekday()


def generate_workout(date_str: str) -> Dict[str, Any]:
    """Generate workout plan for given date based on training split."""
    day_of_week = get_day_of_week(date_str)
    day_plan = SPLIT_SCHEDULE[day_of_week]
    
    workout_type = day_plan["name"]
    muscles = day_plan["muscles"]
    
    # Rest day
    if day_plan["type"] == "rest":
        return {
            "workout_type": "Rest",
            "recommended_exercises": [],
            "plan_metadata": {
                "total_exercises": 0,
                "estimated_duration_minutes": 0,
                "focus_areas": [
                    "rest",
                    "weekly_split:push_pull_legs",
                    f"day_{day_of_week}:rest"
                ]
            }
        }
    
    # Build exercise list
    exercises = []
    for muscle_group in muscles:
        if muscle_group in EXERCISE_TEMPLATES:
            exercises.extend(EXERCISE_TEMPLATES[muscle_group])
    
    # Calculate duration (sets * (reps * 3 sec + rest))
    total_duration = sum(
        ex["target_sets"] * (ex["target_reps"] * 3 + ex["rest_seconds"]) 
        for ex in exercises
    ) // 60
    
    # Build focus areas with weekly split info
    focus_areas = muscles.copy()
    focus_areas.append("weekly_split:push_pull_legs")
    focus_areas.append(f"day_{day_of_week}:{day_plan['type']}")
    
    return {
        "workout_type": workout_type,
        "recommended_exercises": exercises,
        "plan_metadata": {
            "total_exercises": len(exercises),
            "estimated_duration_minutes": total_duration,
            "focus_areas": focus_areas
        }
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "workout_recommendation"}


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "service": "workout_recommendation",
        "version": "1.0.0"
    }


@app.post("/workout/recommend")
async def recommend_workout(request: WorkoutRequest):
    """
    Generate personalized workout recommendation for a specific date.
    
    Args:
        request: WorkoutRequest containing user_id and date (YYYY-MM-DD)
        
    Returns:
        WorkoutResponse with exercises and metadata
    """
    try:
        logger.info(f"Generating workout for user={request.user_id} date={request.date}")
        
        # Generate workout plan
        workout_plan = generate_workout(request.date)
        
        logger.info(
            f"Generated {workout_plan['workout_type']} workout with "
            f"{workout_plan['plan_metadata']['total_exercises']} exercises"
        )
        
        return JSONResponse(status_code=200, content=workout_plan)
        
    except ValueError as e:
        logger.error(f"Invalid date format: {e}")
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid date format: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
