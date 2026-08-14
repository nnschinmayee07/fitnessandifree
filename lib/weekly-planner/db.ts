// ============================================================================
// Weekly Workout Planner - Database Operations Layer
// ============================================================================
// Database operations for weekly workout plans with transaction support
// Requirements: 2.2, 2.3, 2.4, 2.5, 2.9, 3.1, 3.2, 3.4, 3.9, 4.5, 4.6,
//               5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 6.1, 6.2
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WeeklyPlanRow,
  PlanDayRow,
  PlanExerciseRow,
  PlanDayWithExercises,
  WeeklyPlanWithDays,
  AdherenceStatus,
  MLRecommendResponse,
  AdherenceStats,
  WeeklyAdherenceStats,
  DayOfWeekStats,
} from '@/lib/types/weekly-planner';
import {
  logDatabaseOperation,
  logTransactionCommit,
  logTransactionRollback,
  createTimer,
} from './logger';
import { DatabaseError } from './errors';

// ============================================================================
// Error Classes (Re-exported from centralized errors module)
// ============================================================================

export { DatabaseError };

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Creates a new weekly workout plan with all 7 days and exercises
 * 
 * Uses a transaction to ensure atomicity - if any insert fails, all changes
 * are rolled back. This prevents partial weekly plans from being created.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the plan
 * @param weekStartDate - Week start date in YYYY-MM-DD format (Monday)
 * @param mlResponses - Array of 7 ML recommendation responses
 * @returns Promise resolving to the created weekly plan row
 * @throws DatabaseError if any operation fails
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.9**
 * 
 * @example
 * const plan = await createWeeklyPlan(supabase, 'user-123', '2025-01-27', mlResponses);
 */
export async function createWeeklyPlan(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string,
  mlResponses: MLRecommendResponse[]
): Promise<WeeklyPlanRow> {
  if (mlResponses.length !== 7) {
    throw new DatabaseError(
      `Expected 7 ML responses, got ${mlResponses.length}`,
      'createWeeklyPlan'
    );
  }

  const overallTimer = createTimer();

  try {
    // Step 1: Insert weekly_workout_plans row
    const planTimer = createTimer();
    const { data: planData, error: planError } = await supabase
      .from('weekly_workout_plans')
      .insert({
        user_id: userId,
        week_start_date: weekStartDate,
      })
      .select()
      .single();

    logDatabaseOperation({
      operation: 'createWeeklyPlan - insert plan',
      table: 'weekly_workout_plans',
      duration_ms: planTimer.elapsed(),
      message: planError ? 'Failed to insert weekly plan' : 'Inserted weekly plan record',
      context: { user_id: userId, week_start_date: weekStartDate },
    });

    if (planError) {
      logTransactionRollback({
        operation: 'createWeeklyPlan',
        user_id: userId,
        message: 'Transaction rollback: failed to insert plan',
        context: { error: planError.message },
      });

      throw new DatabaseError(
        `Failed to insert weekly plan: ${planError.message}`,
        'createWeeklyPlan - insert plan',
        planError
      );
    }

    if (!planData) {
      logTransactionRollback({
        operation: 'createWeeklyPlan',
        user_id: userId,
        message: 'Transaction rollback: plan insert succeeded but no data returned',
      });

      throw new DatabaseError(
        'Weekly plan insert succeeded but no data returned',
        'createWeeklyPlan - insert plan'
      );
    }

    // Step 2: Prepare all 7 days for batch insert
    const daysToInsert = mlResponses.map((response, dayIndex) => {
      // Derive workout_type from focus_areas if not provided by ML service
      let workoutType = response.workout_type || 'Workout';
      
      // If workout_type is missing or generic, try to infer from focus_areas
      if (!response.workout_type || response.workout_type === 'Unknown') {
        const focusAreas = response.plan_metadata.focus_areas || [];
        // Filter out metadata tags
        const actualAreas = focusAreas.filter(a => 
          !a.startsWith('day_') && !a.startsWith('weekly_split:')
        );
        
        if (actualAreas.includes('rest') || response.recommended_exercises.length === 0) {
          workoutType = 'Rest';
        } else if (actualAreas.length > 0) {
          // Use first focus area as workout type (e.g., "push", "pull", "legs")
          workoutType = actualAreas[0].charAt(0).toUpperCase() + actualAreas[0].slice(1);
        }
      }
      
      return {
        weekly_plan_id: planData.id,
        day_index: dayIndex,
        workout_type: workoutType,
        estimated_duration_minutes: response.plan_metadata.estimated_duration_minutes,
        focus_muscle_groups: response.plan_metadata.focus_areas,
      };
    });

    // Step 3: Batch insert all 7 days
    const daysTimer = createTimer();
    const { data: daysData, error: daysError } = await supabase
      .from('weekly_plan_days')
      .insert(daysToInsert)
      .select();

    logDatabaseOperation({
      operation: 'createWeeklyPlan - insert days',
      table: 'weekly_plan_days',
      duration_ms: daysTimer.elapsed(),
      message: daysError ? 'Failed to insert plan days' : 'Inserted 7 plan days',
      context: { plan_id: planData.id, days_count: 7 },
    });

    if (daysError) {
      // Rollback: delete the plan (CASCADE will delete any inserted days)
      await supabase
        .from('weekly_workout_plans')
        .delete()
        .eq('id', planData.id);

      logTransactionRollback({
        operation: 'createWeeklyPlan',
        user_id: userId,
        message: 'Transaction rollback: failed to insert plan days',
        context: { plan_id: planData.id, error: daysError.message },
      });

      throw new DatabaseError(
        `Failed to insert plan days: ${daysError.message}`,
        'createWeeklyPlan - insert days',
        daysError
      );
    }

    if (!daysData || daysData.length !== 7) {
      // Rollback: delete the plan
      await supabase
        .from('weekly_workout_plans')
        .delete()
        .eq('id', planData.id);

      logTransactionRollback({
        operation: 'createWeeklyPlan',
        user_id: userId,
        message: 'Transaction rollback: expected 7 days but got different count',
        context: { plan_id: planData.id, actual_count: daysData?.length || 0 },
      });

      throw new DatabaseError(
        `Expected 7 plan days, got ${daysData?.length || 0}`,
        'createWeeklyPlan - insert days'
      );
    }

    // Step 4: Prepare all exercises for batch insert
    const exercisesToInsert: Array<{
      plan_day_id: string;
      exercise_id: string;
      target_sets: number;
      target_reps: number;
      suggested_weight_kg: number;
      rest_seconds: number;
      order_index: number;
      rationale: string;
    }> = [];

    daysData.forEach((day, dayIndex) => {
      const exercises = mlResponses[dayIndex].recommended_exercises;
      exercises.forEach((exercise, exerciseIndex) => {
        exercisesToInsert.push({
          plan_day_id: day.id,
          exercise_id: exercise.exercise_id,
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
          suggested_weight_kg: exercise.suggested_weight_kg,
          rest_seconds: exercise.rest_seconds,
          order_index: exerciseIndex,
          rationale: exercise.rationale,
        });
      });
    });

    // Step 5: Batch insert all exercises (if any)
    if (exercisesToInsert.length > 0) {
      const exercisesTimer = createTimer();
      const { error: exercisesError } = await supabase
        .from('weekly_plan_exercises')
        .insert(exercisesToInsert);

      logDatabaseOperation({
        operation: 'createWeeklyPlan - insert exercises',
        table: 'weekly_plan_exercises',
        duration_ms: exercisesTimer.elapsed(),
        message: exercisesError ? 'Failed to insert exercises' : 'Inserted exercises for all days',
        context: { plan_id: planData.id, exercises_count: exercisesToInsert.length },
      });

      if (exercisesError) {
        // Rollback: delete the plan (CASCADE will delete days and any inserted exercises)
        await supabase
          .from('weekly_workout_plans')
          .delete()
          .eq('id', planData.id);

        logTransactionRollback({
          operation: 'createWeeklyPlan',
          user_id: userId,
          message: 'Transaction rollback: failed to insert exercises',
          context: { plan_id: planData.id, error: exercisesError.message },
        });

        throw new DatabaseError(
          `Failed to insert exercises: ${exercisesError.message}`,
          'createWeeklyPlan - insert exercises',
          exercisesError
        );
      }
    }

    // Log successful transaction commit
    logTransactionCommit({
      operation: 'createWeeklyPlan',
      user_id: userId,
      message: 'Successfully committed weekly plan creation transaction',
      context: {
        plan_id: planData.id,
        days_inserted: 7,
        exercises_inserted: exercisesToInsert.length,
        total_duration_ms: overallTimer.elapsed(),
      },
    });

    // Return the created plan
    return planData as WeeklyPlanRow;
  } catch (error) {
    // Re-throw DatabaseError as-is
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new DatabaseError(
      `Unexpected error creating weekly plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'createWeeklyPlan',
      error
    );
  }
}

/**
 * Retrieves a weekly plan with all days and exercises
 * 
 * If weekStartDate is provided, returns exact match for that week.
 * If weekStartDate is omitted, returns most recent plan (ORDER BY week_start_date DESC).
 * 
 * Uses JOIN queries to fetch nested structure:
 * - weekly_workout_plans
 *   → weekly_plan_days (with adherence_status)
 *     → weekly_plan_exercises
 *       → exercises (for name, muscle_group, equipment)
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the plan
 * @param weekStartDate - Optional week start date (YYYY-MM-DD). If omitted, returns most recent.
 * @returns Promise resolving to complete plan with days and exercises, or null if not found
 * @throws DatabaseError if query fails
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.6, 5.7**
 * 
 * @example
 * // Get specific week
 * const plan = await getWeeklyPlan(supabase, 'user-123', '2025-01-27');
 * 
 * // Get most recent week
 * const latestPlan = await getWeeklyPlan(supabase, 'user-123');
 */
export async function getWeeklyPlan(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate?: string
): Promise<WeeklyPlanWithDays | null> {
  const overallTimer = createTimer();

  try {
    // Step 1: Fetch the weekly plan
    const planTimer = createTimer();
    let planQuery = supabase
      .from('weekly_workout_plans')
      .select('*')
      .eq('user_id', userId);

    if (weekStartDate) {
      // Exact match for specific week
      planQuery = planQuery.eq('week_start_date', weekStartDate);
    } else {
      // Most recent plan
      planQuery = planQuery.order('week_start_date', { ascending: false }).limit(1);
    }

    const { data: planData, error: planError } = await planQuery.single();

    logDatabaseOperation({
      operation: 'getWeeklyPlan - fetch plan',
      table: 'weekly_workout_plans',
      duration_ms: planTimer.elapsed(),
      message: planError ? 'Failed to fetch weekly plan' : 'Fetched weekly plan record',
      context: { user_id: userId, week_start_date: weekStartDate || 'most_recent' },
    });

    if (planError) {
      // PGRST116 is "not found" error code in PostgREST
      if (planError.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(
        `Failed to fetch weekly plan: ${planError.message}`,
        'getWeeklyPlan - fetch plan',
        planError
      );
    }

    if (!planData) {
      return null;
    }

    // Step 2: Fetch all plan days for this weekly plan
    const daysTimer = createTimer();
    const { data: daysData, error: daysError } = await supabase
      .from('weekly_plan_days')
      .select('*')
      .eq('weekly_plan_id', planData.id)
      .order('day_index', { ascending: true });

    logDatabaseOperation({
      operation: 'getWeeklyPlan - fetch days',
      table: 'weekly_plan_days',
      duration_ms: daysTimer.elapsed(),
      message: daysError ? 'Failed to fetch plan days' : 'Fetched plan days',
      context: { plan_id: planData.id, days_count: daysData?.length || 0 },
    });

    if (daysError) {
      throw new DatabaseError(
        `Failed to fetch plan days: ${daysError.message}`,
        'getWeeklyPlan - fetch days',
        daysError
      );
    }

    if (!daysData || daysData.length === 0) {
      throw new DatabaseError(
        'Weekly plan exists but has no days',
        'getWeeklyPlan - fetch days'
      );
    }

    // Step 3: Fetch all exercises for all days with exercise details
    const dayIds = daysData.map(day => day.id);
    
    const exercisesTimer = createTimer();
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('weekly_plan_exercises')
      .select(`
        *,
        exercises:exercise_id (
          name,
          muscle_group,
          equipment
        )
      `)
      .in('plan_day_id', dayIds)
      .order('order_index', { ascending: true });

    logDatabaseOperation({
      operation: 'getWeeklyPlan - fetch exercises',
      table: 'weekly_plan_exercises',
      duration_ms: exercisesTimer.elapsed(),
      message: exercisesError ? 'Failed to fetch exercises' : 'Fetched exercises with details',
      context: { plan_id: planData.id, exercises_count: exercisesData?.length || 0 },
    });

    if (exercisesError) {
      throw new DatabaseError(
        `Failed to fetch exercises: ${exercisesError.message}`,
        'getWeeklyPlan - fetch exercises',
        exercisesError
      );
    }

    // Step 4: Group exercises by plan_day_id
    const exercisesByDay = new Map<string, PlanDayWithExercises['exercises']>();
    
    if (exercisesData) {
      for (const exercise of exercisesData) {
        if (!exercisesByDay.has(exercise.plan_day_id)) {
          exercisesByDay.set(exercise.plan_day_id, []);
        }

        // Extract exercise details from joined data
        const exerciseDetails = exercise.exercises as unknown as {
          name: string;
          muscle_group: string;
          equipment: string;
        } | null;

        exercisesByDay.get(exercise.plan_day_id)!.push({
          id: exercise.id,
          plan_day_id: exercise.plan_day_id,
          exercise_id: exercise.exercise_id,
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
          suggested_weight_kg: exercise.suggested_weight_kg,
          rest_seconds: exercise.rest_seconds,
          order_index: exercise.order_index,
          rationale: exercise.rationale,
          exercise_name: exerciseDetails?.name || 'Unknown',
          muscle_group: exerciseDetails?.muscle_group || 'Unknown',
          equipment: exerciseDetails?.equipment || 'Unknown',
        });
      }
    }

    // Step 5: Build plan_days with exercises
    const planDays: PlanDayWithExercises[] = daysData.map(day => ({
      ...day,
      exercises: exercisesByDay.get(day.id) || [],
    })) as PlanDayWithExercises[];

    // Step 6: Calculate total weekly duration
    const totalWeeklyDuration = planDays.reduce(
      (sum, day) => sum + day.estimated_duration_minutes,
      0
    );

    // Step 7: Build complete response
    const result: WeeklyPlanWithDays = {
      ...(planData as WeeklyPlanRow),
      plan_days: planDays,
      plan_metadata: {
        total_weekly_duration_minutes: totalWeeklyDuration,
      },
    };

    logDatabaseOperation({
      operation: 'getWeeklyPlan',
      table: 'weekly_workout_plans',
      duration_ms: overallTimer.elapsed(),
      message: 'Successfully retrieved complete weekly plan',
      context: {
        plan_id: planData.id,
        days_count: planDays.length,
        total_exercises: exercisesData?.length || 0,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error fetching weekly plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'getWeeklyPlan',
      error
    );
  }
}

/**
 * Regenerates a specific day in a weekly plan
 * 
 * Deletes the existing Plan_Day and its exercises (via CASCADE),
 * then inserts a new Plan_Day with updated exercises from ML response.
 * 
 * All other days in the plan remain unchanged.
 * Updates the weekly_workout_plans.updated_at timestamp.
 * 
 * @param supabase - Supabase client instance
 * @param planId - Weekly plan ID
 * @param dayIndex - Day index to regenerate (0-6 for Monday-Sunday)
 * @param mlResponse - ML recommendation for the new day
 * @returns Promise resolving to the new plan day with exercises
 * @throws DatabaseError if operation fails
 * 
 * **Validates: Requirements 3.1, 3.2, 3.4, 3.9**
 * 
 * @example
 * const newDay = await regenerateDay(supabase, planId, 2, mlResponse);
 * console.log(`Regenerated ${newDay.workout_type} for day ${newDay.day_index}`);
 */
export async function regenerateDay(
  supabase: SupabaseClient,
  planId: string,
  dayIndex: number,
  mlResponse: MLRecommendResponse
): Promise<PlanDayWithExercises> {
  const overallTimer = createTimer();

  try {
    // Step 1: Delete existing plan day (CASCADE deletes exercises)
    const deleteTimer = createTimer();
    const { error: deleteError } = await supabase
      .from('weekly_plan_days')
      .delete()
      .eq('weekly_plan_id', planId)
      .eq('day_index', dayIndex);

    logDatabaseOperation({
      operation: 'regenerateDay - delete old day',
      table: 'weekly_plan_days',
      duration_ms: deleteTimer.elapsed(),
      message: deleteError ? 'Failed to delete existing day' : 'Deleted existing plan day',
      context: { plan_id: planId, day_index: dayIndex },
    });

    if (deleteError) {
      logTransactionRollback({
        operation: 'regenerateDay',
        message: 'Transaction rollback: failed to delete existing day',
        context: { plan_id: planId, day_index: dayIndex, error: deleteError.message },
      });

      throw new DatabaseError(
        `Failed to delete existing day: ${deleteError.message}`,
        'regenerateDay - delete day',
        deleteError
      );
    }

    // Step 2: Insert new plan day
    const insertDayTimer = createTimer();
    const { data: newDayData, error: insertDayError } = await supabase
      .from('weekly_plan_days')
      .insert({
        weekly_plan_id: planId,
        day_index: dayIndex,
        workout_type: mlResponse.workout_type,
        estimated_duration_minutes: mlResponse.plan_metadata.estimated_duration_minutes,
        focus_muscle_groups: mlResponse.plan_metadata.focus_areas,
      })
      .select()
      .single();

    logDatabaseOperation({
      operation: 'regenerateDay - insert new day',
      table: 'weekly_plan_days',
      duration_ms: insertDayTimer.elapsed(),
      message: insertDayError ? 'Failed to insert new day' : 'Inserted new plan day',
      context: { plan_id: planId, day_index: dayIndex, workout_type: mlResponse.workout_type },
    });

    if (insertDayError) {
      logTransactionRollback({
        operation: 'regenerateDay',
        message: 'Transaction rollback: failed to insert new day',
        context: { plan_id: planId, day_index: dayIndex, error: insertDayError.message },
      });

      throw new DatabaseError(
        `Failed to insert new day: ${insertDayError.message}`,
        'regenerateDay - insert day',
        insertDayError
      );
    }

    if (!newDayData) {
      logTransactionRollback({
        operation: 'regenerateDay',
        message: 'Transaction rollback: day insert succeeded but no data returned',
        context: { plan_id: planId, day_index: dayIndex },
      });

      throw new DatabaseError(
        'Day insert succeeded but no data returned',
        'regenerateDay - insert day'
      );
    }

    // Step 3: Insert exercises for the new day
    const exercisesToInsert = mlResponse.recommended_exercises.map((exercise, index) => ({
      plan_day_id: newDayData.id,
      exercise_id: exercise.exercise_id,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      suggested_weight_kg: exercise.suggested_weight_kg,
      rest_seconds: exercise.rest_seconds,
      order_index: index,
      rationale: exercise.rationale,
    }));

    if (exercisesToInsert.length > 0) {
      const exercisesTimer = createTimer();
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('weekly_plan_exercises')
        .insert(exercisesToInsert)
        .select(`
          *,
          exercises:exercise_id (
            name,
            muscle_group,
            equipment
          )
        `);

      logDatabaseOperation({
        operation: 'regenerateDay - insert exercises',
        table: 'weekly_plan_exercises',
        duration_ms: exercisesTimer.elapsed(),
        message: exercisesError ? 'Failed to insert exercises' : 'Inserted exercises for new day',
        context: { plan_day_id: newDayData.id, exercises_count: exercisesToInsert.length },
      });

      if (exercisesError) {
        // Rollback: delete the newly inserted day
        await supabase
          .from('weekly_plan_days')
          .delete()
          .eq('id', newDayData.id);

        logTransactionRollback({
          operation: 'regenerateDay',
          message: 'Transaction rollback: failed to insert exercises',
          context: { plan_id: planId, day_index: dayIndex, error: exercisesError.message },
        });

        throw new DatabaseError(
          `Failed to insert exercises: ${exercisesError.message}`,
          'regenerateDay - insert exercises',
          exercisesError
        );
      }

      // Step 4: Build result with exercise details
      const exercises = exercisesData.map(exercise => {
        const exerciseDetails = exercise.exercises as unknown as {
          name: string;
          muscle_group: string;
          equipment: string;
        } | null;

        return {
          id: exercise.id,
          plan_day_id: exercise.plan_day_id,
          exercise_id: exercise.exercise_id,
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
          suggested_weight_kg: exercise.suggested_weight_kg,
          rest_seconds: exercise.rest_seconds,
          order_index: exercise.order_index,
          rationale: exercise.rationale,
          exercise_name: exerciseDetails?.name || 'Unknown',
          muscle_group: exerciseDetails?.muscle_group || 'Unknown',
          equipment: exerciseDetails?.equipment || 'Unknown',
        };
      });

      // Step 5: Update weekly_workout_plans.updated_at
      const { error: updateError } = await supabase
        .from('weekly_workout_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', planId);

      if (updateError) {
        // Non-critical error, just log it
        logDatabaseOperation({
          operation: 'regenerateDay - update timestamp',
          table: 'weekly_workout_plans',
          duration_ms: 0,
          message: 'Failed to update plan timestamp (non-critical)',
          context: { plan_id: planId, error: updateError.message },
        });
      }

      logTransactionCommit({
        operation: 'regenerateDay',
        message: 'Successfully committed day regeneration transaction',
        context: {
          plan_id: planId,
          day_index: dayIndex,
          exercises_inserted: exercises.length,
          total_duration_ms: overallTimer.elapsed(),
        },
      });

      return {
        ...(newDayData as PlanDayRow),
        exercises,
      };
    }

    // No exercises case
    const { error: updateError } = await supabase
      .from('weekly_workout_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (updateError) {
      logDatabaseOperation({
        operation: 'regenerateDay - update timestamp',
        table: 'weekly_workout_plans',
        duration_ms: 0,
        message: 'Failed to update plan timestamp (non-critical)',
        context: { plan_id: planId, error: updateError.message },
      });
    }

    logTransactionCommit({
      operation: 'regenerateDay',
      message: 'Successfully committed day regeneration transaction (no exercises)',
      context: {
        plan_id: planId,
        day_index: dayIndex,
        total_duration_ms: overallTimer.elapsed(),
      },
    });

    return {
      ...(newDayData as PlanDayRow),
      exercises: [],
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error regenerating day: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'regenerateDay',
      error
    );
  }
}

/**
 * Updates adherence status for a plan day
 * 
 * If status is 'completed', sets completed_at to current timestamp.
 * For all other statuses, completed_at remains unchanged.
 * 
 * @param supabase - Supabase client instance
 * @param planDayId - Plan day ID to update
 * @param status - New adherence status
 * @returns Promise resolving to the updated plan day
 * @throws DatabaseError if operation fails
 * 
 * **Validates: Requirements 4.5, 4.6**
 * 
 * @example
 * const updated = await updateAdherence(supabase, dayId, 'completed');
 * console.log(`Completed at: ${updated.completed_at}`);
 */
export async function updateAdherence(
  supabase: SupabaseClient,
  planDayId: string,
  status: AdherenceStatus
): Promise<PlanDayRow> {
  try {
    // Build update object conditionally
    const updateData: {
      adherence_status: AdherenceStatus;
      completed_at?: string;
    } = {
      adherence_status: status,
    };

    // Set completed_at if status is 'completed'
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('weekly_plan_days')
      .update(updateData)
      .eq('id', planDayId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to update adherence: ${error.message}`,
        'updateAdherence',
        error
      );
    }

    if (!data) {
      throw new DatabaseError(
        'Adherence update succeeded but no data returned',
        'updateAdherence'
      );
    }

    return data as PlanDayRow;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error updating adherence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'updateAdherence',
      error
    );
  }
}

/**
 * Retrieves adherence history and statistics for a user
 * 
 * Calculates:
 * - Weekly breakdown with completion rates
 * - Day-of-week patterns (Monday-Sunday)
 * - Top 3 most completed muscle groups
 * - Overall completion rate
 * - Average workout duration (completed days only)
 * 
 * Excludes 'not_started' days from completion rate calculations.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch history for
 * @param weeksBack - Number of weeks to look back (default 4, max 12)
 * @returns Promise resolving to adherence statistics
 * @throws DatabaseError if query fails
 * 
 * **Validates: Requirements 6.1, 6.2**
 * 
 * @example
 * const stats = await getAdherenceHistory(supabase, 'user-123', 8);
 * console.log(`Overall completion: ${stats.overall_completion_rate_percentage}%`);
 */
export async function getAdherenceHistory(
  supabase: SupabaseClient,
  userId: string,
  weeksBack: number = 4
): Promise<AdherenceStats> {
  // Cap weeks_back at 12
  const cappedWeeksBack = Math.min(weeksBack, 12);

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cappedWeeksBack * 7);
  const cutoffDateString = cutoffDate.toISOString().split('T')[0];

  try {
    // Fetch all weekly plans within the time range
    const { data: plansData, error: plansError } = await supabase
      .from('weekly_workout_plans')
      .select(`
        id,
        week_start_date,
        weekly_plan_days (
          id,
          day_index,
          adherence_status,
          estimated_duration_minutes,
          focus_muscle_groups
        )
      `)
      .eq('user_id', userId)
      .gte('week_start_date', cutoffDateString)
      .order('week_start_date', { ascending: false });

    if (plansError) {
      throw new DatabaseError(
        `Failed to fetch adherence history: ${plansError.message}`,
        'getAdherenceHistory',
        plansError
      );
    }

    // Return empty stats if no plans
    if (!plansData || plansData.length === 0) {
      return {
        weekly_stats: [],
        day_of_week_breakdown: [],
        most_completed_muscle_groups: [],
        overall_completion_rate_percentage: 0,
      };
    }

    // Process each week's statistics
    const weeklyStats: WeeklyAdherenceStats[] = [];
    const dayOfWeekCounts = new Map<number, { completed: number; total: number }>();
    const muscleGroupCounts = new Map<string, number>();
    let totalCompletedDays = 0;
    let totalPlannedDays = 0;
    let totalDuration = 0;
    let completedDaysCount = 0;

    for (const plan of plansData) {
      const days = plan.weekly_plan_days as unknown as PlanDayRow[];
      
      let weekCompleted = 0;
      let weekSkipped = 0;
      let weekPlanned = 0;
      let weekDuration = 0;
      let weekCompletedDuration = 0;
      let weekCompletedCount = 0;

      for (const day of days) {
        // Exclude not_started from planned days
        if (day.adherence_status !== 'not_started') {
          weekPlanned++;
          totalPlannedDays++;
        }

        if (day.adherence_status === 'completed') {
          weekCompleted++;
          totalCompletedDays++;
          weekCompletedCount++;
          weekCompletedDuration += day.estimated_duration_minutes;
          completedDaysCount++;
          totalDuration += day.estimated_duration_minutes;

          // Count muscle groups for completed days
          if (day.focus_muscle_groups && Array.isArray(day.focus_muscle_groups)) {
            for (const muscleGroup of day.focus_muscle_groups) {
              muscleGroupCounts.set(
                muscleGroup,
                (muscleGroupCounts.get(muscleGroup) || 0) + 1
              );
            }
          }
        } else if (day.adherence_status === 'skipped') {
          weekSkipped++;
        }

        // Track day-of-week statistics
        const dayOfWeekData = dayOfWeekCounts.get(day.day_index) || {
          completed: 0,
          total: 0,
        };
        
        if (day.adherence_status !== 'not_started') {
          dayOfWeekData.total++;
        }
        
        if (day.adherence_status === 'completed') {
          dayOfWeekData.completed++;
        }
        
        dayOfWeekCounts.set(day.day_index, dayOfWeekData);
      }

      const weekCompletionRate = weekPlanned > 0 
        ? Math.round((weekCompleted / weekPlanned) * 1000) / 10
        : 0;

      const weekAvgDuration = weekCompletedCount > 0
        ? Math.round(weekCompletedDuration / weekCompletedCount)
        : 0;

      weeklyStats.push({
        week_start_date: plan.week_start_date,
        total_planned_days: weekPlanned,
        completed_days: weekCompleted,
        skipped_days: weekSkipped,
        completion_rate_percentage: weekCompletionRate,
        average_workout_duration_minutes: weekAvgDuration,
      });
    }

    // Calculate overall completion rate
    const overallCompletionRate = totalPlannedDays > 0
      ? Math.round((totalCompletedDays / totalPlannedDays) * 1000) / 10
      : 0;

    // Build day-of-week breakdown
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayOfWeekBreakdown: DayOfWeekStats[] = [];

    for (let i = 0; i < 7; i++) {
      const data = dayOfWeekCounts.get(i) || { completed: 0, total: 0 };
      const completionRate = data.total > 0
        ? Math.round((data.completed / data.total) * 1000) / 10
        : 0;

      dayOfWeekBreakdown.push({
        day_of_week: dayNames[i],
        total_planned: data.total,
        completed: data.completed,
        completion_rate_percentage: completionRate,
      });
    }

    // Get top 3 muscle groups
    const muscleGroupEntries = Array.from(muscleGroupCounts.entries());
    muscleGroupEntries.sort((a, b) => b[1] - a[1]);
    const topMuscleGroups = muscleGroupEntries.slice(0, 3).map(entry => entry[0]);

    return {
      weekly_stats: weeklyStats,
      day_of_week_breakdown: dayOfWeekBreakdown,
      most_completed_muscle_groups: topMuscleGroups,
      overall_completion_rate_percentage: overallCompletionRate,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error fetching adherence history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'getAdherenceHistory',
      error
    );
  }
}
