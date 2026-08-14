// ============================================================================
// Workout Session API Route Tests
// ============================================================================
// Unit tests for POST /api/workout/session
// Requirements: 9.5, 9.6, 9.7, 9.11, 3.1, 3.2, 3.9
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../session/route';
import { createServerClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('POST /api/workout/session', () => {
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

  describe('Validation', () => {
    it('should return 400 for invalid JSON', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid JSON');
      expect(body.code).toBe('INVALID_JSON');
    });

    it('should return 400 when user_id is missing', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: 'plan-123',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('user_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when plan_id is missing', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('plan_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when date is invalid', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'plan-123',
          date: 'invalid-date',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('date');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when user_id is empty string', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '',
          plan_id: 'plan-123',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('user_id');
    });

    it('should return 400 when plan_id is empty string - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: '',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('plan_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when date is missing - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'plan-123',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('date');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for date with incorrect format (MM/DD/YYYY) - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'plan-123',
          date: '01/15/2024', // Wrong format
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('date');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid date values - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'plan-123',
          date: '2024-13-45', // Invalid month and day
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('date');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Plan Verification', () => {
    it('should return 404 when plan does not exist - Requirement 9.6', async () => {
      // Mock plan lookup - plan not found
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Plan not found' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'nonexistent-plan',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Plan not found');
      expect(body.code).toBe('PLAN_NOT_FOUND');
    });

    it('should return 404 when plan exists but belongs to different user - Requirement 9.6', async () => {
      // Mock plan lookup - plan not found for this user
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Plan not found' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'other-users-plan',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Plan not found');
      expect(body.code).toBe('PLAN_NOT_FOUND');
    });
  });

  describe('Session Creation', () => {
    it('should create session with status=in_progress and return 200 - Requirement 9.5, 9.10', async () => {
      const mockUserId = 'user-123';
      const mockPlanId = 'plan-456';
      const mockDate = '2024-01-15';
      const mockNotes = 'Test session notes';

      // Mock plan lookup - plan exists
      const mockPlanSelect = vi.fn().mockReturnThis();
      const mockPlanEq1 = vi.fn().mockReturnThis();
      const mockPlanEq2 = vi.fn().mockReturnThis();
      const mockPlanSingle = vi.fn().mockResolvedValue({
        data: { id: mockPlanId },
        error: null,
      });

      // Mock session insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSessionSelect = vi.fn().mockReturnThis();
      const mockSessionSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'session-789',
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
          status: 'in_progress',
          notes: mockNotes,
          started_at: '2024-01-15T10:00:00Z',
          completed_at: null,
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: workout_plans lookup
          return {
            select: mockPlanSelect,
          };
        } else {
          // Second call: workout_logs insert
          return {
            insert: mockInsert,
          };
        }
      });

      mockPlanSelect.mockReturnValue({
        eq: mockPlanEq1,
      });
      mockPlanEq1.mockReturnValue({
        eq: mockPlanEq2,
      });
      mockPlanEq2.mockReturnValue({
        single: mockPlanSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSessionSelect,
      });
      mockSessionSelect.mockReturnValue({
        single: mockSessionSingle,
      });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
          notes: mockNotes,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.id).toBe('session-789');
      expect(body.user_id).toBe(mockUserId);
      expect(body.plan_id).toBe(mockPlanId);
      expect(body.status).toBe('in_progress');
      expect(body.started_at).toBeTruthy();
      expect(body.completed_at).toBeNull();

      // Verify insert was called with correct data
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUserId,
        plan_id: mockPlanId,
        date: mockDate,
        status: 'in_progress',
        notes: mockNotes,
        started_at: expect.any(String),
        completed_at: null,
      });
    });

    it('should create session without notes when notes not provided - Requirement 9.5, 9.10', async () => {
      const mockUserId = 'user-123';
      const mockPlanId = 'plan-456';
      const mockDate = '2024-01-15';

      // Mock plan lookup - plan exists
      const mockPlanSelect = vi.fn().mockReturnThis();
      const mockPlanEq1 = vi.fn().mockReturnThis();
      const mockPlanEq2 = vi.fn().mockReturnThis();
      const mockPlanSingle = vi.fn().mockResolvedValue({
        data: { id: mockPlanId },
        error: null,
      });

      // Mock session insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSessionSelect = vi.fn().mockReturnThis();
      const mockSessionSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'session-789',
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
          status: 'in_progress',
          notes: null,
          started_at: '2024-01-15T10:00:00Z',
          completed_at: null,
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockPlanSelect };
        } else {
          return { insert: mockInsert };
        }
      });

      mockPlanSelect.mockReturnValue({ eq: mockPlanEq1 });
      mockPlanEq1.mockReturnValue({ eq: mockPlanEq2 });
      mockPlanEq2.mockReturnValue({ single: mockPlanSingle });
      mockInsert.mockReturnValue({ select: mockSessionSelect });
      mockSessionSelect.mockReturnValue({ single: mockSessionSingle });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.notes).toBeNull();
    });

    it('should return response with all required fields including id - Requirement 9.10', async () => {
      const mockUserId = 'user-123';
      const mockPlanId = 'plan-456';
      const mockDate = '2024-01-15';

      // Mock plan lookup - plan exists
      const mockPlanSelect = vi.fn().mockReturnThis();
      const mockPlanEq1 = vi.fn().mockReturnThis();
      const mockPlanEq2 = vi.fn().mockReturnThis();
      const mockPlanSingle = vi.fn().mockResolvedValue({
        data: { id: mockPlanId },
        error: null,
      });

      // Mock session insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSessionSelect = vi.fn().mockReturnThis();
      const mockSessionSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'generated-session-id',
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
          status: 'in_progress',
          notes: null,
          started_at: '2024-01-15T10:00:00Z',
          completed_at: null,
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockPlanSelect };
        } else {
          return { insert: mockInsert };
        }
      });

      mockPlanSelect.mockReturnValue({ eq: mockPlanEq1 });
      mockPlanEq1.mockReturnValue({ eq: mockPlanEq2 });
      mockPlanEq2.mockReturnValue({ single: mockPlanSingle });
      mockInsert.mockReturnValue({ select: mockSessionSelect });
      mockSessionSelect.mockReturnValue({ single: mockSessionSingle });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: mockUserId,
          plan_id: mockPlanId,
          date: mockDate,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      // Verify all required fields are present
      expect(body.id).toBe('generated-session-id');
      expect(typeof body.id).toBe('string');
      expect(body.user_id).toBe(mockUserId);
      expect(body.plan_id).toBe(mockPlanId);
      expect(body.date).toBe(mockDate);
      expect(body.status).toBe('in_progress');
      expect(body.started_at).toBeTruthy();
      expect(body).toHaveProperty('completed_at');
      expect(body).toHaveProperty('notes');
    });

    it('should return 500 when database insert fails - Requirement 9.12', async () => {
      // Mock plan lookup - plan exists
      const mockPlanSelect = vi.fn().mockReturnThis();
      const mockPlanEq1 = vi.fn().mockReturnThis();
      const mockPlanEq2 = vi.fn().mockReturnThis();
      const mockPlanSingle = vi.fn().mockResolvedValue({
        data: { id: 'plan-456' },
        error: null,
      });

      // Mock session insert - fails
      const mockInsert = vi.fn().mockReturnThis();
      const mockSessionSelect = vi.fn().mockReturnThis();
      const mockSessionSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockPlanSelect };
        } else {
          return { insert: mockInsert };
        }
      });

      mockPlanSelect.mockReturnValue({ eq: mockPlanEq1 });
      mockPlanEq1.mockReturnValue({ eq: mockPlanEq2 });
      mockPlanEq2.mockReturnValue({ single: mockPlanSingle });
      mockInsert.mockReturnValue({ select: mockSessionSelect });
      mockSessionSelect.mockReturnValue({ single: mockSessionSingle });

      const request = new Request('http://localhost/api/workout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          plan_id: 'plan-456',
          date: '2024-01-15',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to create workout session');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });
});
