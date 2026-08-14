// ============================================================================
// Workout Session Update API Tests
// ============================================================================
// Tests for PATCH /api/workout/session/:id endpoint
// Requirements: 9.5, 9.6, 9.7, 3.2, 3.9
// ============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { PATCH } from '../session/[id]/route';
import { createServerClient } from '@/lib/supabase/server';

// Mock the Supabase client for unit tests
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// Mock the Supabase client for unit tests
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// ============================================================================
// Unit Tests (with mocks)
// ============================================================================

describe('PATCH /api/workout/session/:id - Unit Tests', () => {
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

  describe('Session Update to Completed', () => {
    it('should update session to completed and set completed_at timestamp - Requirement 3.9, 9.10', async () => {
      const mockSessionId = 'session-123';
      const mockExistingSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'in_progress',
        notes: 'Initial notes',
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      };

      // Mock existing session fetch
      const mockFetchSelect = vi.fn().mockReturnThis();
      const mockFetchEq = vi.fn().mockReturnThis();
      const mockFetchSingle = vi.fn().mockResolvedValue({
        data: mockExistingSession,
        error: null,
      });

      // Mock session update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockReturnThis();
      const mockUpdateSelect = vi.fn().mockReturnThis();
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: {
          ...mockExistingSession,
          status: 'completed',
          completed_at: '2024-01-15T12:00:00Z',
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch existing session
          return { select: mockFetchSelect };
        } else {
          // Second call: update session
          return { update: mockUpdate };
        }
      });

      mockFetchSelect.mockReturnValue({ eq: mockFetchEq });
      mockFetchEq.mockReturnValue({ single: mockFetchSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });
      mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
      mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.status).toBe('completed');
      expect(body.completed_at).toBeTruthy();
      expect(typeof body.completed_at).toBe('string');

      // Verify update was called with completed_at timestamp
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(String),
      });
    });

    it('should update session to abandoned and set completed_at timestamp - Requirement 3.9, 9.10', async () => {
      const mockSessionId = 'session-456';
      const mockExistingSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'in_progress',
        notes: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      };

      // Mock existing session fetch
      const mockFetchSelect = vi.fn().mockReturnThis();
      const mockFetchEq = vi.fn().mockReturnThis();
      const mockFetchSingle = vi.fn().mockResolvedValue({
        data: mockExistingSession,
        error: null,
      });

      // Mock session update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockReturnThis();
      const mockUpdateSelect = vi.fn().mockReturnThis();
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: {
          ...mockExistingSession,
          status: 'abandoned',
          completed_at: '2024-01-15T10:30:00Z',
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockFetchSelect };
        } else {
          return { update: mockUpdate };
        }
      });

      mockFetchSelect.mockReturnValue({ eq: mockFetchEq });
      mockFetchEq.mockReturnValue({ single: mockFetchSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });
      mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
      mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'abandoned',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.status).toBe('abandoned');
      expect(body.completed_at).toBeTruthy();
      expect(typeof body.completed_at).toBe('string');
    });

    it('should include updated notes when provided - Requirement 9.10', async () => {
      const mockSessionId = 'session-789';
      const mockExistingSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'in_progress',
        notes: 'Original notes',
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      };

      // Mock existing session fetch
      const mockFetchSelect = vi.fn().mockReturnThis();
      const mockFetchEq = vi.fn().mockReturnThis();
      const mockFetchSingle = vi.fn().mockResolvedValue({
        data: mockExistingSession,
        error: null,
      });

      // Mock session update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockReturnThis();
      const mockUpdateSelect = vi.fn().mockReturnThis();
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: {
          ...mockExistingSession,
          status: 'completed',
          notes: 'Updated completion notes',
          completed_at: '2024-01-15T12:00:00Z',
        },
        error: null,
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockFetchSelect };
        } else {
          return { update: mockUpdate };
        }
      });

      mockFetchSelect.mockReturnValue({ eq: mockFetchEq });
      mockFetchEq.mockReturnValue({ single: mockFetchSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });
      mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
      mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Updated completion notes',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.notes).toBe('Updated completion notes');
      
      // Verify update was called with notes
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(String),
        notes: 'Updated completion notes',
      });
    });
  });

  describe('Invalid Status Transitions - Requirement 3.2, 3.9', () => {
    it('should reject transition from completed to abandoned', async () => {
      const mockSessionId = 'session-123';
      const mockCompletedSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'completed',
        notes: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T11:00:00Z',
      };

      // Mock fetch - session is already completed
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCompletedSession,
        error: null,
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'abandoned',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      
      expect(body.error).toContain('Invalid status transition');
      expect(body.error).toContain('completed');
      expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject transition from abandoned to completed', async () => {
      const mockSessionId = 'session-456';
      const mockAbandonedSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'abandoned',
        notes: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:30:00Z',
      };

      // Mock fetch - session is abandoned
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockAbandonedSession,
        error: null,
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      
      expect(body.error).toContain('Invalid status transition');
      expect(body.error).toContain('abandoned');
      expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject transition from in_progress to in_progress', async () => {
      const mockSessionId = 'session-789';
      const mockInProgressSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'in_progress',
        notes: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      };

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      
      // This should fail at validation level since 'in_progress' is not a valid target status
      expect(body.error).toContain('status');
      expect(body.error).toMatch(/completed|abandoned/);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid JSON - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session/session-123', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request, { params: { id: 'session-123' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid JSON body');
      expect(body.code).toBe('INVALID_JSON');
    });

    it('should return 400 when status is missing - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session/session-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'No status field',
        }),
      });

      const response = await PATCH(request, { params: { id: 'session-123' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('status');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when status has invalid value - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session/session-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'invalid_status',
        }),
      });

      const response = await PATCH(request, { params: { id: 'session-123' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('completed');
      expect(body.error).toContain('abandoned');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when status is not a string - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session/session-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 123, // number instead of string
        }),
      });

      const response = await PATCH(request, { params: { id: 'session-123' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('status');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when notes is not a string - Requirement 9.7', async () => {
      const request = new Request('http://localhost/api/workout/session/session-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          notes: 12345, // number instead of string
        }),
      });

      const response = await PATCH(request, { params: { id: 'session-123' } });
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('notes');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Session Not Found - Requirement 9.6', () => {
    it('should return 404 when session does not exist', async () => {
      const mockSessionId = 'nonexistent-session';

      // Mock fetch - session not found
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Session not found' },
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(404);
      const body = await response.json();
      
      expect(body.error).toBe('Session not found');
      expect(body.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('Database Errors', () => {
    it('should return 500 when database update fails', async () => {
      const mockSessionId = 'session-123';
      const mockExistingSession = {
        id: mockSessionId,
        user_id: 'user-123',
        plan_id: 'plan-456',
        date: '2024-01-15',
        status: 'in_progress',
        notes: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      };

      // Mock fetch - success
      const mockFetchSelect = vi.fn().mockReturnThis();
      const mockFetchEq = vi.fn().mockReturnThis();
      const mockFetchSingle = vi.fn().mockResolvedValue({
        data: mockExistingSession,
        error: null,
      });

      // Mock update - failure
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockReturnThis();
      const mockUpdateSelect = vi.fn().mockReturnThis();
      const mockUpdateSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockFetchSelect };
        } else {
          return { update: mockUpdate };
        }
      });

      mockFetchSelect.mockReturnValue({ eq: mockFetchEq });
      mockFetchEq.mockReturnValue({ single: mockFetchSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });
      mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
      mockUpdateSelect.mockReturnValue({ single: mockUpdateSingle });

      const request = new Request(`http://localhost/api/workout/session/${mockSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const response = await PATCH(request, { params: { id: mockSessionId } });
      
      expect(response.status).toBe(500);
      const body = await response.json();
      
      expect(body.error).toContain('Failed to update workout session');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });
});

// ============================================================================
// Integration Tests (real database)
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only run integration tests if environment variables are available
const shouldRunIntegrationTests = Boolean(supabaseUrl && supabaseServiceKey);

const supabase = shouldRunIntegrationTests 
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

describe.skipIf(!shouldRunIntegrationTests)('PATCH /api/workout/session/:id - Integration Tests', () => {
  let testUserId: string;
  let testPlanId: string;
  let testSessionId: string;

  beforeAll(async () => {
    if (!supabase) return;
    
    // Create test user ID
    testUserId = `test-user-${Date.now()}`;

    // Create a test workout plan
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: testUserId,
        name: 'Test Workout Plan',
        description: 'Test plan for session update tests',
        is_template: false,
      })
      .select()
      .single();

    if (planError || !planData) {
      throw new Error(`Failed to create test plan: ${planError?.message}`);
    }

    testPlanId = planData.id;

    // Create a test session in 'in_progress' status
    const { data: sessionData, error: sessionError } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-15',
        status: 'in_progress',
        notes: 'Initial session notes',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      throw new Error(`Failed to create test session: ${sessionError?.message}`);
    }

    testSessionId = sessionData.id;
  });

  afterAll(async () => {
    if (!supabase) return;
    
    // Clean up test data
    await supabase.from('workout_logs').delete().eq('user_id', testUserId);
    await supabase.from('workout_plans').delete().eq('user_id', testUserId);
  });

  it('should update session status to completed and set completed_at timestamp', async () => {
    const response = await fetch(
      `http://localhost:3000/api/workout/session/${testSessionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Great workout!',
        }),
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(testSessionId);
    expect(data.status).toBe('completed');
    expect(data.notes).toBe('Great workout!');
    expect(data.completed_at).toBeTruthy();
    expect(typeof data.completed_at).toBe('string');

    // Verify completed_at is a valid ISO timestamp
    const completedAt = new Date(data.completed_at);
    expect(completedAt.getTime()).toBeGreaterThan(0);
  });

  it('should update session status to abandoned', async () => {
    // Create another session for this test
    const { data: newSession } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-16',
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${newSession!.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'abandoned',
        }),
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('abandoned');
    expect(data.completed_at).toBeTruthy();
  });

  it('should reject invalid status values', async () => {
    // Create another session for this test
    const { data: newSession } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-17',
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${newSession!.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress', // Invalid: cannot transition to same status
        }),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid status transition');
    expect(data.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should reject status transition from completed', async () => {
    // Create a completed session
    const { data: completedSession } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-18',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${completedSession!.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'abandoned',
        }),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid status transition');
    expect(data.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should reject missing status field', async () => {
    const response = await fetch(
      `http://localhost:3000/api/workout/session/${testSessionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'No status provided',
        }),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('status');
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 for non-existent session ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${fakeId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      }
    );

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Session not found');
    expect(data.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 400 for invalid JSON body', async () => {
    const response = await fetch(
      `http://localhost:3000/api/workout/session/${testSessionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Invalid JSON body');
    expect(data.code).toBe('INVALID_JSON');
  });

  it('should update notes when provided', async () => {
    // Create another session
    const { data: newSession } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-19',
        status: 'in_progress',
        notes: 'Original notes',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${newSession!.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          notes: 'Updated notes after completion',
        }),
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.notes).toBe('Updated notes after completion');
  });

  it('should preserve existing notes when notes not provided', async () => {
    // Create another session
    const { data: newSession } = await supabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: testPlanId,
        date: '2024-01-20',
        status: 'in_progress',
        notes: 'Existing notes',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const response = await fetch(
      `http://localhost:3000/api/workout/session/${newSession!.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.notes).toBe('Existing notes');
  });
});
