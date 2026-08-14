// ============================================================================
// Weekly Workout Planner - Adherence Aggregation Utilities
// ============================================================================
// Utility functions for calculating adherence statistics and metrics
// Requirements: 6.2, 6.3, 6.5, 6.8, 6.10
// ============================================================================

import type { PlanDayRow } from '@/lib/types/weekly-planner';

/**
 * Calculate completion rate as a percentage rounded to 1 decimal place
 * 
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @returns Percentage rounded to 1 decimal (0.0 - 100.0), or 0.0 if total is 0
 * 
 * **Validates: Requirement 6.2**
 * 
 * @example
 * calculateCompletionRate(3, 5) // returns 60.0
 * calculateCompletionRate(0, 0) // returns 0.0
 * calculateCompletionRate(7, 7) // returns 100.0
 */
export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) {
    return 0.0;
  }
  
  const rate = (completed / total) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal place
}

/**
 * Day of week information with completion statistics
 */
interface DayOfWeekAggregation {
  day_index: number;
  day_name: string;
  total: number;
  completed: number;
  completion_rate: number;
}

/**
 * Aggregate plan days by day of week and calculate per-day completion rates
 * 
 * Groups plan days by their day_index (0-6 for Monday-Sunday) and calculates
 * completion rates for each day of the week across all historical plans.
 * 
 * @param planDays - Array of plan day rows to aggregate
 * @returns Array of 7 elements (one per day of week), ordered Monday to Sunday
 * 
 * **Validates: Requirements 6.3, 6.5**
 * 
 * @example
 * const planDays = [
 *   { day_index: 0, adherence_status: 'completed', ... }, // Monday
 *   { day_index: 0, adherence_status: 'skipped', ... },   // Monday
 *   { day_index: 1, adherence_status: 'completed', ... }, // Tuesday
 * ];
 * aggregateByDayOfWeek(planDays)
 * // Returns: [
 * //   { day_index: 0, day_name: 'Monday', total: 2, completed: 1, completion_rate: 50.0 },
 * //   { day_index: 1, day_name: 'Tuesday', total: 1, completed: 1, completion_rate: 100.0 },
 * //   ...
 * // ]
 */
export function aggregateByDayOfWeek(planDays: PlanDayRow[]): DayOfWeekAggregation[] {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Initialize aggregation structure for all 7 days
  const aggregations: Map<number, { total: number; completed: number }> = new Map();
  for (let i = 0; i < 7; i++) {
    aggregations.set(i, { total: 0, completed: 0 });
  }
  
  // Count total and completed for each day_index
  for (const planDay of planDays) {
    const dayIndex = planDay.day_index;
    const stats = aggregations.get(dayIndex);
    
    if (stats) {
      stats.total++;
      if (planDay.adherence_status === 'completed') {
        stats.completed++;
      }
    }
  }
  
  // Build result array with completion rates
  const results: DayOfWeekAggregation[] = [];
  for (let i = 0; i < 7; i++) {
    const stats = aggregations.get(i)!;
    results.push({
      day_index: i,
      day_name: dayNames[i],
      total: stats.total,
      completed: stats.completed,
      completion_rate: calculateCompletionRate(stats.completed, stats.total),
    });
  }
  
  return results;
}

/**
 * Extract top N muscle groups from plan days based on frequency
 * 
 * Counts occurrences of each muscle group across all plan days'
 * focus_muscle_groups arrays and returns the most frequent ones.
 * 
 * @param planDays - Array of plan day rows
 * @param limit - Maximum number of muscle groups to return (default: 3)
 * @returns Array of muscle group names, sorted by frequency (descending)
 * 
 * **Validates: Requirement 6.10**
 * 
 * @example
 * const planDays = [
 *   { focus_muscle_groups: ['chest', 'triceps'], ... },
 *   { focus_muscle_groups: ['back', 'biceps'], ... },
 *   { focus_muscle_groups: ['chest', 'shoulders'], ... },
 * ];
 * getTopMuscleGroups(planDays, 2)
 * // Returns: ['chest', 'triceps'] (or similar based on frequency)
 */
export function getTopMuscleGroups(planDays: PlanDayRow[], limit: number = 3): string[] {
  const muscleGroupCounts = new Map<string, number>();
  
  // Count occurrences of each muscle group
  for (const planDay of planDays) {
    for (const muscleGroup of planDay.focus_muscle_groups) {
      const currentCount = muscleGroupCounts.get(muscleGroup) || 0;
      muscleGroupCounts.set(muscleGroup, currentCount + 1);
    }
  }
  
  // Sort by frequency (descending) and take top N
  const sortedMuscleGroups = Array.from(muscleGroupCounts.entries())
    .sort((a, b) => b[1] - a[1])  // Sort by count descending
    .map(([muscleGroup]) => muscleGroup)
    .slice(0, limit);
  
  return sortedMuscleGroups;
}

/**
 * Calculate average workout duration from completed plan days only
 * 
 * Filters plan days to only those with adherence_status = 'completed'
 * and calculates the mean of their estimated_duration_minutes.
 * 
 * @param planDays - Array of plan day rows
 * @returns Average duration in minutes, or 0 if no completed days
 * 
 * **Validates: Requirement 6.8**
 * 
 * @example
 * const planDays = [
 *   { adherence_status: 'completed', estimated_duration_minutes: 45, ... },
 *   { adherence_status: 'skipped', estimated_duration_minutes: 60, ... },
 *   { adherence_status: 'completed', estimated_duration_minutes: 50, ... },
 * ];
 * calculateAverageDuration(planDays)
 * // Returns: 47.5 (average of 45 and 50, skipped day excluded)
 */
export function calculateAverageDuration(planDays: PlanDayRow[]): number {
  const completedDays = planDays.filter(day => day.adherence_status === 'completed');
  
  if (completedDays.length === 0) {
    return 0;
  }
  
  const totalDuration = completedDays.reduce(
    (sum, day) => sum + day.estimated_duration_minutes,
    0
  );
  
  return totalDuration / completedDays.length;
}
