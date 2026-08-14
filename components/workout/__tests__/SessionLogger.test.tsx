// @vitest-environment jsdom

/**
 * Component tests for SessionLogger
 * Requirements: 3 (Workout Session Logging), 4 (Real-Time Session Updates),
 *               14.2 (Optimistic updates), 16 (Accessibility and Usability)
 *
 * Task: 11.4 Write component tests for SessionLogger
 */

import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import SessionLogger from "../SessionLogger";

// ---------------------------------------------------------------------------
// Module mocks – must come before any imports of mocked modules
// ---------------------------------------------------------------------------

// Mock the Supabase client singleton
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

// Mock framer-motion so AnimatePresence / motion.div render children without
// animation overhead or DOM complexity
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock real-time subscription helper
vi.mock("@/lib/workout/realtime", () => ({
  setupWorkoutRealtimeSubscription: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Lazy imports so mocks are registered first
// ---------------------------------------------------------------------------
import { createClient } from "@/lib/supabase/client";
import { setupWorkoutRealtimeSubscription } from "@/lib/workout/realtime";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const createMockQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

/** Minimal exercise data used across all tests */
const makeExercise = (overrides: Partial<typeof baseExercise1> = {}) => ({
  ...baseExercise1,
  ...overrides,
});

const baseExercise1 = {
  id: "pe1",
  plan_id: "plan1",
  exercise_id: "ex1",
  target_sets: 3,
  target_reps: 10,
  rest_seconds: 90,
  order_index: 0,
  exercise: {
    id: "ex1",
    name: "bench_press",
    muscle_group: "chest" as const,
    equipment: "barbell" as const,
    instructions: "Lie on bench and press the barbell.",
    media_url: null,
    created_at: "2024-01-01T00:00:00Z",
  },
};

const baseExercise2 = {
  id: "pe2",
  plan_id: "plan1",
  exercise_id: "ex2",
  target_sets: 3,
  target_reps: 12,
  rest_seconds: 60,
  order_index: 1,
  exercise: {
    id: "ex2",
    name: "squat",
    muscle_group: "legs" as const,
    equipment: "barbell" as const,
    instructions: "Stand with feet shoulder-width apart.",
    media_url: null,
    created_at: "2024-01-01T00:00:00Z",
  },
};

const mockPlanExercises = [baseExercise1, baseExercise2];

/** Returns a mock supabase client wired up with the given plan exercises and
 *  logged sets. */
function buildMockSupabase(
  planExercises = mockPlanExercises,
  loggedSets: any[] = []
) {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  const mockSupabase: any = {
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "plan_exercises") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: planExercises,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "logged_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: loggedSets,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
  };

  return mockSupabase;
}

/** Wrapper used in every render call */
const Wrapper = ({ children, client }: { children: React.ReactNode; client: QueryClient }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

describe("SessionLogger", () => {
  let queryClient: QueryClient;
  let mockFetch: Mock;
  const mockRealtimeCleanup = vi.fn();

  beforeEach(() => {
    queryClient = createMockQueryClient();
    vi.clearAllMocks();

    // Default supabase mock
    (createClient as Mock).mockReturnValue(
      buildMockSupabase(mockPlanExercises, [])
    );

    // Real-time subscription mock returns a minimal subscription object
    (setupWorkoutRealtimeSubscription as Mock).mockReturnValue({
      cleanup: mockRealtimeCleanup,
      getReconnectionState: () => ({
        isReconnecting: false,
        attemptCount: 0,
        lastError: null,
      }),
    });

    // Fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // localStorage mock
    const localStorageData: Record<string, string> = {};
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: vi.fn((k: string) => localStorageData[k] ?? null),
        setItem: vi.fn((k: string, v: string) => { localStorageData[k] = v; }),
        removeItem: vi.fn((k: string) => { delete localStorageData[k]; }),
        clear: vi.fn(() => { Object.keys(localStorageData).forEach((k) => delete localStorageData[k]); }),
        key: vi.fn(),
        length: 0,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderLogger = (props: Partial<React.ComponentProps<typeof SessionLogger>> = {}) => {
    const defaultProps = {
      workoutId: "workout1",
      planId: "plan1",
      userId: "user1",
      onComplete: vi.fn(),
    };
    return render(
      <Wrapper client={queryClient}>
        <SessionLogger {...defaultProps} {...props} />
      </Wrapper>
    );
  };

  // =========================================================================
  // 1. Loading state
  // =========================================================================
  it("renders loading skeleton while exercises are fetching", () => {
    // Override so the query never resolves (stays pending)
    (createClient as Mock).mockReturnValue({
      ...buildMockSupabase(),
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
          }),
        }),
      })),
    });

    renderLogger();

    // Loading skeleton has animate-pulse class
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeTruthy();
  });

  // =========================================================================
  // 2. Empty exercises state
  // =========================================================================
  it('renders "No exercises found" when plan has no exercises', async () => {
    (createClient as Mock).mockReturnValue(buildMockSupabase([], []));

    renderLogger();

    await waitFor(() => {
      expect(
        screen.getByText(/no exercises found in this plan/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. Current exercise information
  // =========================================================================
  it("displays current exercise name, target sets, and target reps", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });

    expect(screen.getByText("Exercise 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Target: 3 sets × 10 reps")).toBeInTheDocument();
    expect(screen.getByText("chest")).toBeInTheDocument();
  });

  // =========================================================================
  // 4a. Weight validation error
  // =========================================================================
  it("shows error when weight is out of bounds (> 9999)", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // Error appears in both the visual alert div and the ARIA live region — use role="alert"
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /weight must be between 0 and 9999/i
      );
    });
  });

  // =========================================================================
  // 4b. Reps validation error
  // =========================================================================
  it("shows error when reps is out of bounds (> 999)", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // The error message appears in both the visual alert div and the ARIA live region
    await waitFor(() => {
      const matches = screen.getAllByText(/reps must be between 1 and 999/i);
      expect(matches.length).toBeGreaterThan(0);
    });
    // Specifically check the visible alert role element
    expect(screen.getByRole("alert")).toHaveTextContent(/reps must be between 1 and 999/i);
  });

  // =========================================================================
  // 4c. RPE validation error
  // =========================================================================
  it("shows error when RPE is out of bounds (> 10)", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "10" },
    });
    fireEvent.change(
      screen.getByLabelText(/rate of perceived exertion/i),
      { target: { value: "11" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // The error message appears in both the visual alert div and the ARIA live region
    await waitFor(() => {
      const matches = screen.getAllByText(/rpe must be between 1 and 10/i);
      expect(matches.length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/rpe must be between 1 and 10/i);
  });

  // =========================================================================
  // 5. Successful set logging
  // =========================================================================
  it("calls logSetMutation and announces to screen readers on successful set log", async () => {
    // Use an exercise with rest_seconds=0 so no timer announcement overwrites the set log announcement
    const exerciseNoRest = {
      ...baseExercise1,
      rest_seconds: 0,
    };
    (createClient as Mock).mockReturnValue(
      buildMockSupabase([exerciseNoRest, baseExercise2], [])
    );

    const setResponse = {
      id: "set1",
      workout_log_id: "workout1",
      exercise_id: "ex1",
      set_number: 1,
      weight_kg: 50,
      reps: 10,
      rpe: 7,
      logged_at: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => setResponse,
    });

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "10" },
    });
    fireEvent.change(
      screen.getByLabelText(/rate of perceived exertion/i),
      { target: { value: "7" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // Mutation fired with correct payload
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/workout/set",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            workout_id: "workout1",
            exercise_id: "ex1",
            set_number: 1,
            weight_kg: 50,
            reps: 10,
            rpe: 7,
          }),
        })
      );
    });

    // ARIA live region announces completion (Req 16.3)
    // With rest_seconds=0, no timer message overwrites the set log announcement
    await waitFor(() => {
      const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/set 1 logged/i);
    });
  });

  // =========================================================================
  // 6. Rest timer starts after logging (when rest_seconds > 0)
  // =========================================================================
  it("starts rest timer after logging a set when rest_seconds > 0", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "set1",
        workout_log_id: "workout1",
        exercise_id: "ex1",
        set_number: 1,
        weight_kg: 50,
        reps: 10,
        rpe: 7,
        logged_at: new Date().toISOString(),
      }),
    });

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "10" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /log set/i }));
    });

    // bench_press has rest_seconds=90 → timer should appear
    await waitFor(() => {
      expect(screen.getByText("Rest Time")).toBeInTheDocument();
    }, { timeout: 3000 });

    // 90 seconds shown as 1:30
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  // =========================================================================
  // 7. Rest timer skip button
  // =========================================================================
  it("skip button clears rest timer", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "set1",
        workout_log_id: "workout1",
        exercise_id: "ex1",
        set_number: 1,
        weight_kg: 100,
        reps: 5,
        rpe: 8,
        logged_at: new Date().toISOString(),
      }),
    });

    renderLogger();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // Wait for rest timer to appear
    await waitFor(() => {
      expect(screen.getByText("Rest Time")).toBeInTheDocument();
    });

    // Click skip
    fireEvent.click(
      screen.getByRole("button", { name: /skip rest timer/i })
    );

    await waitFor(() => {
      expect(screen.queryByText("Rest Time")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 8. Navigate to next/previous exercise
  // =========================================================================
  it("navigates to next and previous exercises", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });

    // Navigate forward
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("squat")).toBeInTheDocument();
    });
    expect(screen.getByText("Exercise 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Target: 3 sets × 12 reps")).toBeInTheDocument();

    // Navigate back
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });
    expect(screen.getByText("Exercise 1 of 2")).toBeInTheDocument();
  });

  // =========================================================================
  // 9. Complete Workout button
  // =========================================================================
  it("calls PATCH API and invokes onComplete when workout is completed", async () => {
    const onComplete = vi.fn();

    // Single-exercise plan so "Complete Workout" button is visible
    (createClient as Mock).mockReturnValue(
      buildMockSupabase([baseExercise1], [])
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed" }),
    });

    renderLogger({ onComplete });

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /complete workout/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/workout/session/workout1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
        })
      );
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 10. Keyboard shortcut: Enter triggers log set when inputs are filled
  // =========================================================================
  it("Enter key triggers log set when weight and reps inputs are filled", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "set1",
        workout_log_id: "workout1",
        exercise_id: "ex1",
        set_number: 1,
        weight_kg: 80,
        reps: 8,
        rpe: 7,
        logged_at: new Date().toISOString(),
      }),
    });

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    const weightInput = screen.getByLabelText(/weight in kilograms/i);
    const repsInput = screen.getByLabelText(/number of repetitions/i);

    fireEvent.change(weightInput, { target: { value: "80" } });
    fireEvent.change(repsInput, { target: { value: "8" } });

    // Fire Enter while an input is focused (the keyboard handler checks isInputFocused)
    fireEvent.keyDown(weightInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/workout/set",
        expect.anything()
      );
    });
  });

  // =========================================================================
  // 11. Keyboard shortcut: Escape clears inputs
  // =========================================================================
  it("Escape key clears all set inputs", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    const weightInput = screen.getByLabelText(/weight in kilograms/i);
    const repsInput = screen.getByLabelText(/number of repetitions/i);

    fireEvent.change(weightInput, { target: { value: "75" } });
    fireEvent.change(repsInput, { target: { value: "12" } });

    // Press Escape anywhere on the window
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect((weightInput as HTMLInputElement).value).toBe("");
      expect((repsInput as HTMLInputElement).value).toBe("");
    });
  });

  // =========================================================================
  // 12. ARIA live region announces set completions
  // =========================================================================
  it("ARIA live region announces set completion to screen readers", async () => {
    // Use exercise with rest_seconds=0 so the set-logged announcement is not overwritten
    const exerciseNoRest = { ...baseExercise1, rest_seconds: 0 };
    (createClient as Mock).mockReturnValue(
      buildMockSupabase([exerciseNoRest, baseExercise2], [])
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "set1",
        workout_log_id: "workout1",
        exercise_id: "ex1",
        set_number: 1,
        weight_kg: 60,
        reps: 12,
        rpe: 6,
        logged_at: new Date().toISOString(),
      }),
    });

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "12" },
    });
    fireEvent.change(
      screen.getByLabelText(/rate of perceived exertion/i),
      { target: { value: "6" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    await waitFor(() => {
      // The sr-only div with role="status" aria-live="polite"
      const liveRegion = document.querySelector(
        '[role="status"][aria-live="polite"]'
      );
      expect(liveRegion).toBeTruthy();
      // Announcement: "Set 1 logged: 60 kilograms for 12 repetitions at RPE 6"
      expect(liveRegion!.textContent).toMatch(/set 1 logged/i);
      expect(liveRegion!.textContent).toMatch(/60/);
      expect(liveRegion!.textContent).toMatch(/12/);
    });
  });

  // =========================================================================
  // 13. Optimistic UI: set appears immediately before server response
  // =========================================================================
  it("optimistically adds set to UI before server responds", async () => {
    // Return a promise that we control so we can check the optimistic state
    let resolveSet!: (value: any) => void;
    const setPromise = new Promise((res) => { resolveSet = res; });

    mockFetch.mockReturnValueOnce(
      setPromise.then((data) => ({ ok: true, json: async () => data }))
    );

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "90" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "5" },
    });
    fireEvent.change(
      screen.getByLabelText(/rate of perceived exertion/i),
      { target: { value: "8" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // Optimistic entry should appear before server resolves
    await waitFor(() => {
      expect(screen.getByText(/90kg × 5/i)).toBeInTheDocument();
    });

    // Now resolve the server response (replace optimistic with real data)
    const serverSet = {
      id: "real-set-id",
      workout_log_id: "workout1",
      exercise_id: "ex1",
      set_number: 1,
      weight_kg: 90,
      reps: 5,
      rpe: 8,
      logged_at: new Date().toISOString(),
    };
    await act(async () => {
      resolveSet(serverSet);
    });

    // Set should still be visible after reconciliation
    await waitFor(() => {
      expect(screen.getByText(/90kg × 5/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 14. Error rollback: optimistic set removed if mutation fails
  // =========================================================================
  it("rolls back optimistic set when mutation fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    renderLogger();

    await waitFor(() => {
      expect(screen.getByLabelText(/weight in kilograms/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/weight in kilograms/i), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText(/number of repetitions/i), {
      target: { value: "3" },
    });
    fireEvent.change(
      screen.getByLabelText(/rate of perceived exertion/i),
      { target: { value: "9" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /log set/i }));

    // After failure, the optimistic set should be removed and an error shown
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // The completed-sets list should be empty (rollback happened)
    expect(screen.queryByText(/120kg × 3/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // Bonus: real-time subscription is set up and cleaned up
  // =========================================================================
  it("sets up real-time subscription on mount and cleans up on unmount", async () => {
    const { unmount } = renderLogger();

    await waitFor(() => {
      expect(setupWorkoutRealtimeSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user1",
          workoutId: "workout1",
        })
      );
    });

    unmount();

    expect(mockRealtimeCleanup).toHaveBeenCalled();
  });

  // =========================================================================
  // Bonus: Previous button is disabled on first exercise
  // =========================================================================
  it("Previous button is disabled on the first exercise", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  // =========================================================================
  // Bonus: Complete Workout replaces Next on last exercise
  // =========================================================================
  it("shows Complete Workout button on the last exercise and Next button on others", async () => {
    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("bench press")).toBeInTheDocument();
    });

    // On exercise 1, we should see Next (not Complete Workout)
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /complete workout/i })
    ).not.toBeInTheDocument();

    // Move to last exercise
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText("squat")).toBeInTheDocument();
    });

    // On last exercise, Complete Workout replaces Next
    expect(
      screen.getByRole("button", { name: /complete workout/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next/i })
    ).not.toBeInTheDocument();
  });
});
