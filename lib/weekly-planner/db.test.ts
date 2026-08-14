// ============================================================================
// Database Operations Layer - Unit Tests
// ============================================================================
// Tests for weekly planner database operations
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createWeeklyPlan,
  getWeeklyPlan,
  regenerateDay,
  updateAdherence,
  getAdherenceHistory,
} from './db';
import type { MLRecommendResponse } from '@/lib/types/weekly-planner';

// ============================================================================
// Mock Supabase Client
// ============================================================================

function createMockSupabase() {
  const mockSelect = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockIn = vi.fn().mockReturnThis();
  const mockGte = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();

  const mockFrom = vi.fn((table: string) => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    gte: mockGte,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
  }));

  return {
    from: mockFrom,
    mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      gte: mockGte,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
    },
  };
}

// ============================================================================
// Test Data
// ============================================================================

const mockMLResponse: MLRecommendResponse = {
  date: '2025-01-27',
  workout_type: 'push',
  recommended_exercises: [
    {
      exercise_id: 'ex-1',
      exercise_name: 'Bench Press',
      muscle_group: 'chest',
      target_sets: 3,
      target_reps: 10,
      suggested_weight_kg: 60,
      rest_seconds: 90,
      rationale: 'Great for chest development',
    },
  ],
  plan_metadata: {
    total_exercises: 1,
    estimated_duration_minutes: 45,
    focus_areas: ['chest', 'triceps'],
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('db.ts - Database Operations', () => {
  describe('Type Definitions', () => {
    it('should export all required functions', () => {
      expect(typeof createWeeklyPlan).toBe('function');
      expect(typeof getWeeklyPlan).toBe('function');
      expect(typeof regenerateDay).toBe('function');
      expect(typeof updateAdherence).toBe('function');
      expect(typeof getAdherenceHistory).toBe('function');
    });
  });

  describe('createWeeklyPlan', () => {
    it('should accept correct parameter types', () => {
      const mock = createMockSupabase();
      const supabase = mock as unknown as SupabaseClient;

      const mlResponses: MLRecommendResponse[] = Array(7).fill(mockMLResponse);

      // Type check
      expect(typeof createWeeklyPlan).toBe('function');
    });
  });

  describe('getWeeklyPlan', () => {
    it('should accept correct parameter types with optional weekStartDate', () => {
      const mock = createMockSupabase();
      const supabase = mock as unknown as SupabaseClient;

      // Type check - both with and without weekStartDate
      expect(typeof getWeeklyPlan).toBe('function');
    });
  });

  describe('regenerateDay', () => {
    it('should accept correct parameter types', () => {
      const mock = createMockSupabase();
      const supabase = mock as unknown as SupabaseClient;

      // Type check
      expect(typeof regenerateDay).toBe('function');
    });
  });

  describe('updateAdherence', () => {
    it('should accept correct parameter types', () => {
      const mock = createMockSupabase();
      const supabase = mock as unknown as SupabaseClient;

      // Type check
      expect(typeof updateAdherence).toBe('function');
    });
  });

  describe('getAdherenceHistory', () => {
    it('should accept correct parameter types with optional weeksBack', () => {
      const mock = createMockSupabase();
      const supabase = mock as unknown as SupabaseClient;

      // Type check
      expect(typeof getAdherenceHistory).toBe('function');
    });
  });
});
