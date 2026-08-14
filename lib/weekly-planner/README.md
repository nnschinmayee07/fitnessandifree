# Weekly Planner Library

This directory contains the core data access layer and utilities for the Weekly Workout Planner feature.

## Modules

### `ml-client.ts`

HTTP client for ML Engine integration with timeout and error handling.

**Features:**
- Single-day workout recommendation fetching
- 7-day batch recommendation fetching
- 10-second request timeout
- Comprehensive error handling
- Response validation

**Usage:**

```typescript
import { 
  fetchRecommendation, 
  fetchWeeklyRecommendations,
  MLEngineError,
  InvalidMLResponseError 
} from '@/lib/weekly-planner/ml-client';

// Fetch single day
try {
  const recommendation = await fetchRecommendation('user-123', '2025-01-27');
  console.log(`Duration: ${recommendation.plan_metadata.estimated_duration_minutes} min`);
  console.log(`Exercises: ${recommendation.recommended_exercises.length}`);
} catch (error) {
  if (error instanceof MLEngineError) {
    // Handle ML service errors (network, timeout, HTTP errors)
    console.error('ML Engine error:', error.message);
  } else if (error instanceof InvalidMLResponseError) {
    // Handle invalid response structure
    console.error('Invalid response:', error.missingFields);
  }
}

// Fetch 7-day week
try {
  const weeklyRecs = await fetchWeeklyRecommendations('user-123', '2025-01-27');
  console.log(`Fetched ${weeklyRecs.length} days`);
  
  // Process each day
  weeklyRecs.forEach((day, index) => {
    console.log(`Day ${index + 1}: ${day.recommended_exercises.length} exercises`);
  });
} catch (error) {
  // Fails fast on first error to support transaction rollback
  console.error('Weekly fetch failed:', error);
}
```

**Error Classes:**

- `MLEngineError`: Thrown when HTTP request fails, times out, or ML Engine returns error
- `InvalidMLResponseError`: Thrown when response structure is invalid or missing required fields

**Environment Configuration:**

Set `NEXT_PUBLIC_ML_SERVICE_URL` environment variable to configure ML Engine URL:
```bash
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8001
```

Defaults to `http://localhost:8001` if not set.

### `validation.ts`

Input validation utilities for API request bodies.

**Functions:**
- `validateWeeklyPlanInput()` - Validates create plan requests
- `validateRegenerationInput()` - Validates regenerate day requests
- `validateAdherenceInput()` - Validates adherence update requests
- `validateAdherenceStatus()` - Checks adherence status enum
- `normalizeToMonday()` - Adjusts any date to preceding Monday

### `db.ts`

Database operations for weekly planner (implementation in progress).

## Testing

Run all tests:
```bash
npm test -- lib/weekly-planner
```

Run specific test file:
```bash
npm test -- lib/weekly-planner/ml-client.test.ts
npm test -- lib/weekly-planner/validation.test.ts
```

## Requirements Coverage

- **Requirement 2.1**: 7-day sequential ML Engine calls
- **Requirement 2.4**: ML Engine error handling with rollback
- **Requirement 9.5**: MLEngineError for upstream handling  
- **Requirement 9.6**: InvalidMLResponseError for validation failures
- **Requirement 10.7**: 10-second request timeout
