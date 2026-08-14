// ============================================================================
// Workout History API Route Tests
// ============================================================================
// Unit tests for GET /api/workout/history
// Requirements: 9.1, 9.2, 9.11, 9.12, 5.1, 5.2, 5.3
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../history/route';
import { createServerClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('GET /api/workout/history', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    };
    
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  describe('Query Parameter Validation', () => {
    it('should return 400 when userId is missing', async () => {
      const request = new Request('http://localhost/api/workout/history');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });

    it('should return 400 when userId is empty string', async () => {
      const request = new Request('http://localhost/api/workout/history?userId=');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });

    it('should return 400 when startDate format is invalid', async () => {
      const request = new Request('http://localhost/api/workout/history?userId=user-123&startDate=01/15/2024');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('startDate');
      expect(body.code).toBe('INVALID_START_DATE');
    });

    it('should return 400 when endDate format is invalid', async () => {
      const request = new Request('http://localhost/api/workout/history?userId=user-123&endDate=2024/01/15');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('endDate');
      expect(body.code).toBe('INVALID_END_DATE');
    });

    it('should return 400 when limit is not a positive integer', async () => {
      const request = new Request('http://localhost/api/workout/history?userId=user-123&limit=-5');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 when limit is not a number', async () => {
      const request = new Request('http://localhost/api/workout/history?userId=user-123&limit=abc');

      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should cap limit at 200 when exceeding maximum', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123&limit=500');

      await GET(request);
      
      // Verify limit was capped at 200
      expect(mockLimit).toHaveBeenCalledWith(200);
    });

    it('should use default limit of 50 when not specified', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      await GET(request);
      
      // Verify default limit of 50 was used
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });

  describe('Fetching Workout History', () => {
    it('should return empty array when no workouts found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.workouts).toEqual([]);
    });

    it('should return workout history with aggregated data', async () => {
      const mockWorkoutLogs = [
        {
          id: 'workout-1',
          date: '2024-01-15',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T11:30:00Z',
          workout_plans: { name: 'Push Day' },
        },
        {
          id: 'workout-2',
          date: '2024-01-14',
          status: 'completed',
          started_at: '2024-01-14T09:00:00Z',
          completed_at: '2024-01-14T10:15:00Z',
          workout_plans: { name: 'Pull Day' },
        },
      ];

      const mockLoggedSets = [
        // Workout 1 sets
        { workout_log_id: 'workout-1', weight_kg: 100, reps: 10 },
        { workout_log_id: 'workout-1', weight_kg: 100, reps: 8 },
        { workout_log_id: 'workout-1', weight_kg: 50, reps: 12 },
        // Workout 2 sets
        { workout_log_id: 'workout-2', weight_kg: 80, reps: 10 },
        { workout_log_id: 'workout-2', weight_kg: 80, reps: 9 },
      ];

      // Mock workout_logs query
      const mockLogsSelect = vi.fn().mockReturnThis();
      const mockLogsEq = vi.fn().mockReturnThis();
      const mockLogsOrder = vi.fn().mockReturnThis();
      const mockLogsLimit = vi.fn().mockResolvedValue({
        data: mockWorkoutLogs,
        error: null,
      });

      // Mock logged_sets query
      const mockSetsSelect = vi.fn().mockReturnThis();
      const mockSetsIn = vi.fn().mockResolvedValue({
        data: mockLoggedSets,
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: workout_logs
          return {
            select: mockLogsSelect,
          };
        } else {
          // Second call: logged_sets
          return {
            select: mockSetsSelect,
          };
        }
      });

      mockLogsSelect.mockReturnValue({
        eq: mockLogsEq,
      });
      mockLogsEq.mockReturnValue({
        order: mockLogsOrder,
      });
      mockLogsOrder.mockReturnValue({
        limit: mockLogsLimit,
      });

      mockSetsSelect.mockReturnValue({
        in: mockSetsIn,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.workouts).toHaveLength(2);
      
      // Verify first workout
      expect(body.workouts[0].id).toBe('workout-1');
      expect(body.workouts[0].date).toBe('2024-01-15');
      expect(body.workouts[0].plan_name).toBe('Push Day');
      expect(body.workouts[0].status).toBe('completed');
      expect(body.workouts[0].set_count).toBe(3);
      // Volume: (100*10) + (100*8) + (50*12) = 1000 + 800 + 600 = 2400
      expect(body.workouts[0].total_volume).toBe(2400);
      // Duration: 11:30 - 10:00 = 90 minutes = 5400 seconds
      expect(body.workouts[0].duration_seconds).toBe(5400);
      
      // Verify second workout
      expect(body.workouts[1].id).toBe('workout-2');
      expect(body.workouts[1].date).toBe('2024-01-14');
      expect(body.workouts[1].plan_name).toBe('Pull Day');
      expect(body.workouts[1].set_count).toBe(2);
      // Volume: (80*10) + (80*9) = 800 + 720 = 1520
      expect(body.workouts[1].total_volume).toBe(1520);
      // Duration: 10:15 - 09:00 = 75 minutes = 4500 seconds
      expect(body.workouts[1].duration_seconds).toBe(4500);
    });

    it('should return null duration for in-progress workouts', async () => {
      const mockWorkoutLogs = [
        {
          id: 'workout-1',
          date: '2024-01-15',
          status: 'in_progress',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: null,
          workout_plans: { name: 'Push Day' },
        },
      ];

      // Mock workout_logs query
      const mockLogsSelect = vi.fn().mockReturnThis();
      const mockLogsEq = vi.fn().mockReturnThis();
      const mockLogsOrder = vi.fn().mockReturnThis();
      const mockLogsLimit = vi.fn().mockResolvedValue({
        data: mockWorkoutLogs,
        error: null,
      });

      // Mock logged_sets query
      const mockSetsSelect = vi.fn().mockReturnThis();
      const mockSetsIn = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockLogsSelect };
        } else {
          return { select: mockSetsSelect };
        }
      });

      mockLogsSelect.mockReturnValue({ eq: mockLogsEq });
      mockLogsEq.mockReturnValue({ order: mockLogsOrder });
      mockLogsOrder.mockReturnValue({ limit: mockLogsLimit });
      mockSetsSelect.mockReturnValue({ in: mockSetsIn });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.workouts[0].duration_seconds).toBeNull();
    });

    it('should return zero volume and set count for workouts with no sets', async () => {
      const mockWorkoutLogs = [
        {
          id: 'workout-1',
          date: '2024-01-15',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:30:00Z',
          workout_plans: { name: 'Empty Workout' },
        },
      ];

      // Mock workout_logs query
      const mockLogsSelect = vi.fn().mockReturnThis();
      const mockLogsEq = vi.fn().mockReturnThis();
      const mockLogsOrder = vi.fn().mockReturnThis();
      const mockLogsLimit = vi.fn().mockResolvedValue({
        data: mockWorkoutLogs,
        error: null,
      });

      // Mock logged_sets query - no sets
      const mockSetsSelect = vi.fn().mockReturnThis();
      const mockSetsIn = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockLogsSelect };
        } else {
          return { select: mockSetsSelect };
        }
      });

      mockLogsSelect.mockReturnValue({ eq: mockLogsEq });
      mockLogsEq.mockReturnValue({ order: mockLogsOrder });
      mockLogsOrder.mockReturnValue({ limit: mockLogsLimit });
      mockSetsSelect.mockReturnValue({ in: mockSetsIn });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.workouts[0].total_volume).toBe(0);
      expect(body.workouts[0].set_count).toBe(0);
    });

    it('should return 500 when workout logs query fails', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to fetch workout history');
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 when logged sets query fails', async () => {
      const mockWorkoutLogs = [
        {
          id: 'workout-1',
          date: '2024-01-15',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T11:00:00Z',
          workout_plans: { name: 'Push Day' },
        },
      ];

      // Mock workout_logs query - succeeds
      const mockLogsSelect = vi.fn().mockReturnThis();
      const mockLogsEq = vi.fn().mockReturnThis();
      const mockLogsOrder = vi.fn().mockReturnThis();
      const mockLogsLimit = vi.fn().mockResolvedValue({
        data: mockWorkoutLogs,
        error: null,
      });

      // Mock logged_sets query - fails
      const mockSetsSelect = vi.fn().mockReturnThis();
      const mockSetsIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch sets' },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockLogsSelect };
        } else {
          return { select: mockSetsSelect };
        }
      });

      mockLogsSelect.mockReturnValue({ eq: mockLogsEq });
      mockLogsEq.mockReturnValue({ order: mockLogsOrder });
      mockLogsOrder.mockReturnValue({ limit: mockLogsLimit });
      mockSetsSelect.mockReturnValue({ in: mockSetsIn });

      const request = new Request('http://localhost/api/workout/history?userId=user-123');

      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to fetch workout set data');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Date Filtering', () => {
    it('should apply startDate filter when provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123&startDate=2024-01-01');

      await GET(request);
      
      // Verify gte (greater than or equal) was called with startDate
      expect(mockGte).toHaveBeenCalledWith('date', '2024-01-01');
    });

    it('should apply endDate filter when provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123&endDate=2024-01-31');

      await GET(request);
      
      // Verify lte (less than or equal) was called with endDate
      expect(mockLte).toHaveBeenCalledWith('date', '2024-01-31');
    });

    it('should apply both startDate and endDate filters when provided', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        limit: mockLimit,
      });

      const request = new Request('http://localhost/api/workout/history?userId=user-123&startDate=2024-01-01&endDate=2024-01-31');

      await GET(request);
      
      expect(mockGte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockLte).toHaveBeenCalledWith('date', '2024-01-31');
    });
  });
});
