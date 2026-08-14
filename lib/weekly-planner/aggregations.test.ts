// ============================================================================
// Weekly Workout Planner - Adherence Aggregation Utilities Tests
// ============================================================================
// Unit tests for aggregation utility functions
// Requirements: 6.2, 6.3, 6.5, 6.8, 6.10
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calculateCompletionRate,
  aggregateByDayOfWeek,
  getTopMuscleGroups,
  calculateAverageDuration,
} from './aggregations';
import type { PlanDayRow } from '@/lib/types/weekly-planner';

// Helper to create mock plan day
function createMockPlanDay(overrides: Partial<PlanDayRow>): PlanDayRow {
  return {
    id: 'test-id',
    weekly_plan_id: 'plan-id',
    day_index: 0,
    workout_type: 'push',
    estimated_duration_minutes: 45,
    focus_muscle_groups: ['chest'],
    adherence_status: 'not_started',
    completed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('calculateCompletionRate', () => {
  it('should calculate percentage correctly for whole numbers', () => {
    expect(calculateCompletionRate(5, 10)).toBe(50.0);
    expect(calculateCompletionRate(1, 4)).toBe(25.0);
    expect(calculateCompletionRate(3, 3)).toBe(100.0);
  });

  it('should round to 1 decimal place', () => {
    expect(calculateCompletionRate(1, 3)).toBe(33.3);
    expect(calculateCompletionRate(2, 3)).toBe(66.7);
    expect(calculateCompletionRate(1, 7)).toBe(14.3);
  });

  it('should return 0.0 when total is 0', () => {
    expect(calculateCompletionRate(0, 0)).toBe(0.0);
  });

  it('should return 0.0 when completed is 0', () => {
    expect(calculateCompletionRate(0, 10)).toBe(0.0);
  });

  it('should handle edge case of 100% completion', () => {
    expect(calculateCompletionRate(7, 7)).toBe(100.0);
  });
});

describe('aggregateByDayOfWeek', () => {
  it('should return 7 days in order (Monday to Sunday)', () => {
    const planDays: PlanDayRow[] = [];
    const result = aggregateByDayOfWeek(planDays);

    expect(result).toHaveLength(7);
    expect(result[0].day_name).toBe('Monday');
    expect(result[1].day_name).toBe('Tuesday');
    expect(result[2].day_name).toBe('Wednesday');
    expect(result[3].day_name).toBe('Thursday');
    expect(result[4].day_name).toBe('Friday');
    expect(result[5].day_name).toBe('Saturday');
    expect(result[6].day_name).toBe('Sunday');
  });

  it('should initialize all days with zero counts when empty', () => {
    const planDays: PlanDayRow[] = [];
    const result = aggregateByDayOfWeek(planDays);

    result.forEach((day) => {
      expect(day.total).toBe(0);
      expect(day.completed).toBe(0);
      expect(day.completion_rate).toBe(0.0);
    });
  });

  it('should group by day_index correctly', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ day_index: 0, adherence_status: 'completed' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'skipped' }),
      createMockPlanDay({ day_index: 1, adherence_status: 'completed' }),
      createMockPlanDay({ day_index: 6, adherence_status: 'completed' }),
    ];

    const result = aggregateByDayOfWeek(planDays);

    expect(result[0]).toMatchObject({
      day_index: 0,
      day_name: 'Monday',
      total: 2,
      completed: 1,
      completion_rate: 50.0,
    });

    expect(result[1]).toMatchObject({
      day_index: 1,
      day_name: 'Tuesday',
      total: 1,
      completed: 1,
      completion_rate: 100.0,
    });

    expect(result[6]).toMatchObject({
      day_index: 6,
      day_name: 'Sunday',
      total: 1,
      completed: 1,
      completion_rate: 100.0,
    });
  });

  it('should calculate per-day completion rates correctly', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ day_index: 0, adherence_status: 'completed' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'completed' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'skipped' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'in_progress' }),
    ];

    const result = aggregateByDayOfWeek(planDays);

    expect(result[0]).toMatchObject({
      total: 4,
      completed: 2,
      completion_rate: 50.0,
    });
  });

  it('should only count "completed" status as completed', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ day_index: 0, adherence_status: 'completed' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'in_progress' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'skipped' }),
      createMockPlanDay({ day_index: 0, adherence_status: 'not_started' }),
    ];

    const result = aggregateByDayOfWeek(planDays);

    expect(result[0]).toMatchObject({
      total: 4,
      completed: 1,
      completion_rate: 25.0,
    });
  });
});

describe('getTopMuscleGroups', () => {
  it('should return empty array when no plan days', () => {
    const planDays: PlanDayRow[] = [];
    const result = getTopMuscleGroups(planDays, 3);

    expect(result).toEqual([]);
  });

  it('should return muscle groups sorted by frequency', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ focus_muscle_groups: ['chest', 'triceps'] }),
      createMockPlanDay({ focus_muscle_groups: ['back', 'biceps'] }),
      createMockPlanDay({ focus_muscle_groups: ['chest', 'shoulders'] }),
      createMockPlanDay({ focus_muscle_groups: ['legs', 'glutes'] }),
      createMockPlanDay({ focus_muscle_groups: ['chest', 'triceps'] }),
    ];

    const result = getTopMuscleGroups(planDays, 3);

    // chest: 3, triceps: 2, back: 1, biceps: 1, shoulders: 1, legs: 1, glutes: 1
    expect(result[0]).toBe('chest');
    expect(result[1]).toBe('triceps');
    expect(result).toHaveLength(3);
  });

  it('should respect the limit parameter', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ focus_muscle_groups: ['chest', 'triceps', 'shoulders'] }),
      createMockPlanDay({ focus_muscle_groups: ['back', 'biceps', 'traps'] }),
    ];

    const result = getTopMuscleGroups(planDays, 2);

    expect(result).toHaveLength(2);
  });

  it('should default to limit of 3 when not specified', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ focus_muscle_groups: ['a', 'b', 'c', 'd', 'e'] }),
    ];

    const result = getTopMuscleGroups(planDays);

    expect(result).toHaveLength(3);
  });

  it('should handle plan days with empty focus_muscle_groups', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ focus_muscle_groups: [] }),
      createMockPlanDay({ focus_muscle_groups: ['chest'] }),
    ];

    const result = getTopMuscleGroups(planDays, 3);

    expect(result).toEqual(['chest']);
  });

  it('should return fewer than limit if not enough muscle groups exist', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ focus_muscle_groups: ['chest'] }),
      createMockPlanDay({ focus_muscle_groups: ['back'] }),
    ];

    const result = getTopMuscleGroups(planDays, 5);

    expect(result).toHaveLength(2);
  });
});

describe('calculateAverageDuration', () => {
  it('should return 0 when no plan days', () => {
    const planDays: PlanDayRow[] = [];
    const result = calculateAverageDuration(planDays);

    expect(result).toBe(0);
  });

  it('should return 0 when no completed days', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ adherence_status: 'skipped', estimated_duration_minutes: 45 }),
      createMockPlanDay({ adherence_status: 'not_started', estimated_duration_minutes: 60 }),
    ];

    const result = calculateAverageDuration(planDays);

    expect(result).toBe(0);
  });

  it('should calculate average from completed days only', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 45 }),
      createMockPlanDay({ adherence_status: 'skipped', estimated_duration_minutes: 60 }),
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 50 }),
      createMockPlanDay({ adherence_status: 'in_progress', estimated_duration_minutes: 100 }),
    ];

    const result = calculateAverageDuration(planDays);

    // Average of 45 and 50 = 47.5
    expect(result).toBe(47.5);
  });

  it('should handle single completed day', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 45 }),
    ];

    const result = calculateAverageDuration(planDays);

    expect(result).toBe(45);
  });

  it('should calculate correct average for multiple completed days', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 30 }),
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 40 }),
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 50 }),
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 60 }),
    ];

    const result = calculateAverageDuration(planDays);

    // Average of 30, 40, 50, 60 = 45
    expect(result).toBe(45);
  });

  it('should exclude not_started status from average calculation', () => {
    const planDays: PlanDayRow[] = [
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 40 }),
      createMockPlanDay({ adherence_status: 'not_started', estimated_duration_minutes: 100 }),
      createMockPlanDay({ adherence_status: 'completed', estimated_duration_minutes: 60 }),
    ];

    const result = calculateAverageDuration(planDays);

    // Average of 40 and 60 = 50 (not_started excluded)
    expect(result).toBe(50);
  });
});

describe('Integration: Aggregation functions working together', () => {
  it('should work together to produce adherence statistics', () => {
    // Simulate a realistic 4-week history
    const planDays: PlanDayRow[] = [];
    
    // Week 1: Good adherence
    for (let i = 0; i < 5; i++) {
      planDays.push(
        createMockPlanDay({
          day_index: i,
          adherence_status: 'completed',
          estimated_duration_minutes: 45,
          focus_muscle_groups: ['chest', 'back', 'legs'][i % 3] ? [['chest', 'back', 'legs'][i % 3]] : [],
        })
      );
    }
    planDays.push(createMockPlanDay({ day_index: 5, adherence_status: 'skipped', estimated_duration_minutes: 45 }));
    planDays.push(createMockPlanDay({ day_index: 6, adherence_status: 'completed', estimated_duration_minutes: 45, focus_muscle_groups: ['chest'] }));

    // Week 2: Moderate adherence
    for (let i = 0; i < 3; i++) {
      planDays.push(
        createMockPlanDay({
          day_index: i,
          adherence_status: 'completed',
          estimated_duration_minutes: 50,
          focus_muscle_groups: ['back'],
        })
      );
    }
    for (let i = 3; i < 7; i++) {
      planDays.push(createMockPlanDay({ day_index: i, adherence_status: 'skipped', estimated_duration_minutes: 50 }));
    }

    // Test all aggregation functions
    const dayOfWeekBreakdown = aggregateByDayOfWeek(planDays);
    const topMuscleGroups = getTopMuscleGroups(planDays, 3);
    const avgDuration = calculateAverageDuration(planDays);
    const completionRate = calculateCompletionRate(9, 14);

    // Verify reasonable outputs
    expect(dayOfWeekBreakdown).toHaveLength(7);
    expect(dayOfWeekBreakdown[0].total).toBeGreaterThan(0); // Monday should have some data
    expect(topMuscleGroups.length).toBeGreaterThan(0);
    expect(avgDuration).toBeGreaterThan(0);
    expect(completionRate).toBeCloseTo(64.3, 1);
  });
});
