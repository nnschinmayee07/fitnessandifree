// ============================================================================
// Weekly Workout Planner - Validation Unit Tests
// ============================================================================
// Unit tests for validation utilities
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  validateWeeklyPlanInput,
  validateRegenerationInput,
  validateAdherenceInput,
  validateAdherenceStatus,
  normalizeToMonday,
} from './validation';

describe('validateWeeklyPlanInput', () => {
  describe('valid inputs', () => {
    it('should accept valid user_id and week_start_date', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user123',
        week_start_date: '2025-01-27',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept user_id with special characters', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user-123_abc',
        week_start_date: '2025-12-01',
      });

      expect(result.valid).toBe(true);
    });

    it('should accept leap year dates', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user123',
        week_start_date: '2024-02-29',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-object body', () => {
      const result = validateWeeklyPlanInput(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body must be a valid object');
    });

    it('should reject missing user_id', () => {
      const result = validateWeeklyPlanInput({
        week_start_date: '2025-01-27',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'user_id is required and must be a string'
      );
    });

    it('should reject empty user_id', () => {
      const result = validateWeeklyPlanInput({
        user_id: '   ',
        week_start_date: '2025-01-27',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('user_id must not be empty');
    });

    it('should reject missing week_start_date', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'week_start_date is required and must be a string'
      );
    });

    it('should reject invalid date format', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user123',
        week_start_date: '01/27/2025',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'week_start_date must be in YYYY-MM-DD format'
      );
    });

    it('should reject invalid date values', () => {
      const result = validateWeeklyPlanInput({
        user_id: 'user123',
        week_start_date: '2025-13-01', // Invalid month
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('week_start_date must be a valid date');
    });

    it('should reject non-string user_id', () => {
      const result = validateWeeklyPlanInput({
        user_id: 123,
        week_start_date: '2025-01-27',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'user_id is required and must be a string'
      );
    });

    it('should collect multiple errors', () => {
      const result = validateWeeklyPlanInput({
        user_id: '',
        week_start_date: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});

describe('validateRegenerationInput', () => {
  describe('valid inputs', () => {
    it('should accept valid weekly_plan_id and day_index', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: 0,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept day_index at boundaries', () => {
      const resultMin = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: 0,
      });
      const resultMax = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: 6,
      });

      expect(resultMin.valid).toBe(true);
      expect(resultMax.valid).toBe(true);
    });

    it('should accept all valid day indices', () => {
      for (let i = 0; i <= 6; i++) {
        const result = validateRegenerationInput({
          weekly_plan_id: 'plan-uuid-123',
          day_index: i,
        });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-object body', () => {
      const result = validateRegenerationInput('invalid');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body must be a valid object');
    });

    it('should reject missing weekly_plan_id', () => {
      const result = validateRegenerationInput({
        day_index: 3,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'weekly_plan_id is required and must be a string'
      );
    });

    it('should reject empty weekly_plan_id', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: '  ',
        day_index: 3,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('weekly_plan_id must not be empty');
    });

    it('should reject missing day_index', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('day_index is required');
    });

    it('should reject non-number day_index', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: '3',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('day_index must be a number');
    });

    it('should reject non-integer day_index', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: 3.5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('day_index must be an integer');
    });

    it('should reject day_index below 0', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: -1,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'day_index must be between 0 and 6 (Monday-Sunday)'
      );
    });

    it('should reject day_index above 6', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: 'plan-uuid-123',
        day_index: 7,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'day_index must be between 0 and 6 (Monday-Sunday)'
      );
    });

    it('should collect multiple errors', () => {
      const result = validateRegenerationInput({
        weekly_plan_id: '',
        day_index: 10,
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});

describe('validateAdherenceInput', () => {
  describe('valid inputs', () => {
    it('should accept valid plan_day_id and adherence_status', () => {
      const result = validateAdherenceInput({
        plan_day_id: 'day-uuid-123',
        adherence_status: 'completed',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept all valid adherence statuses', () => {
      const statuses = ['not_started', 'in_progress', 'completed', 'skipped'];

      for (const status of statuses) {
        const result = validateAdherenceInput({
          plan_day_id: 'day-uuid-123',
          adherence_status: status,
        });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject non-object body', () => {
      const result = validateAdherenceInput([]);

      expect(result.valid).toBe(false);
      // Arrays are objects in JavaScript, so this will pass the typeof check
      // but fail on missing fields
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should reject missing plan_day_id', () => {
      const result = validateAdherenceInput({
        adherence_status: 'completed',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'plan_day_id is required and must be a string'
      );
    });

    it('should reject empty plan_day_id', () => {
      const result = validateAdherenceInput({
        plan_day_id: '',
        adherence_status: 'completed',
      });

      expect(result.valid).toBe(false);
      // Empty string is falsy, so will trigger first error check
      expect(result.errors).toContain('plan_day_id is required and must be a string');
    });

    it('should reject missing adherence_status', () => {
      const result = validateAdherenceInput({
        plan_day_id: 'day-uuid-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'adherence_status is required and must be a string'
      );
    });

    it('should reject invalid adherence_status', () => {
      const result = validateAdherenceInput({
        plan_day_id: 'day-uuid-123',
        adherence_status: 'invalid_status',
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('adherence_status must be one of:');
    });

    it('should collect multiple errors', () => {
      const result = validateAdherenceInput({
        plan_day_id: '',
        adherence_status: 'wrong',
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(1);
    });
  });
});

describe('validateAdherenceStatus', () => {
  it('should return true for valid statuses', () => {
    expect(validateAdherenceStatus('not_started')).toBe(true);
    expect(validateAdherenceStatus('in_progress')).toBe(true);
    expect(validateAdherenceStatus('completed')).toBe(true);
    expect(validateAdherenceStatus('skipped')).toBe(true);
  });

  it('should return false for invalid statuses', () => {
    expect(validateAdherenceStatus('invalid')).toBe(false);
    expect(validateAdherenceStatus('COMPLETED')).toBe(false);
    expect(validateAdherenceStatus('finished')).toBe(false);
    expect(validateAdherenceStatus('')).toBe(false);
  });
});

describe('normalizeToMonday', () => {
  describe('date normalization', () => {
    it('should return Monday unchanged', () => {
      const result = normalizeToMonday('2025-01-27'); // Monday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Tuesday to preceding Monday', () => {
      const result = normalizeToMonday('2025-01-28'); // Tuesday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Wednesday to preceding Monday', () => {
      const result = normalizeToMonday('2025-01-29'); // Wednesday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Thursday to preceding Monday', () => {
      const result = normalizeToMonday('2025-01-30'); // Thursday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Friday to preceding Monday', () => {
      const result = normalizeToMonday('2025-01-31'); // Friday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Saturday to preceding Monday', () => {
      const result = normalizeToMonday('2025-02-01'); // Saturday
      expect(result).toBe('2025-01-27');
    });

    it('should adjust Sunday to preceding Monday', () => {
      const result = normalizeToMonday('2025-02-02'); // Sunday
      expect(result).toBe('2025-01-27');
    });
  });

  describe('edge cases', () => {
    it('should handle month boundaries', () => {
      const result = normalizeToMonday('2025-02-02'); // Sunday, Feb 2
      expect(result).toBe('2025-01-27'); // Monday, Jan 27
    });

    it('should handle year boundaries', () => {
      const result = normalizeToMonday('2025-01-01'); // Wednesday, Jan 1
      expect(result).toBe('2024-12-30'); // Monday, Dec 30
    });

    it('should handle leap year dates', () => {
      const result = normalizeToMonday('2024-02-29'); // Thursday, leap day
      expect(result).toBe('2024-02-26'); // Monday
    });

    it('should throw error for invalid date', () => {
      expect(() => normalizeToMonday('invalid')).toThrow('Invalid date');
    });

    it('should throw error for impossible date', () => {
      expect(() => normalizeToMonday('2025-13-45')).toThrow('Invalid date');
    });
  });

  describe('format preservation', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = normalizeToMonday('2025-01-29');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should preserve zero-padding in month', () => {
      const result = normalizeToMonday('2025-03-05');
      expect(result).toBe('2025-03-03');
    });

    it('should preserve zero-padding in day', () => {
      const result = normalizeToMonday('2025-01-10');
      expect(result).toBe('2025-01-06');
    });
  });
});
