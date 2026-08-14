// @vitest-environment jsdom

/**
 * Component tests for WorkoutRecommendation
 * Requirements: 8.5 (Loading skeleton), 6.4 (Recommendation exercises), 8.6 (Error banner with retry)
 *
 * Task: 17.2 Write component tests for WorkoutRecommendation
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import WorkoutRecommendation from "../WorkoutRecommendation";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock framer-motion so AnimatePresence / motion.div render children without
// animation overhead or DOM complexity
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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

const Wrapper = ({
  children,
  client,
}: {
  children: React.ReactNode;
  client: QueryClient;
}) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockResponse = {
  recommended_exercises: [
    {
      exercise_id: "ex1",
      exercise_name: "bench_press",
      muscle_group: "chest",
      target_sets: 3,
      target_reps: 10,
      suggested_weight_kg: 82.5,
      rest_seconds: 90,
      rationale: "Increase from 80.0kg (avg RPE 7.0 last session)",
    },
    {
      exercise_id: "ex2",
      exercise_name: "squat",
      muscle_group: "legs",
      target_sets: 3,
      target_reps: 8,
      suggested_weight_kg: 97.5,
      rest_seconds: 120,
      rationale: "Maintain at 97.5kg (avg RPE 8.5 last session)",
    },
  ],
  plan_metadata: {
    total_exercises: 2,
    estimated_duration_minutes: 45,
    focus_areas: ["chest", "legs"],
  },
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

describe("WorkoutRecommendation", () => {
  let queryClient: QueryClient;
  let mockFetch: Mock;

  beforeEach(() => {
    queryClient = createMockQueryClient();
    vi.clearAllMocks();

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof WorkoutRecommendation>> = {}
  ) => {
    const defaultProps = {
      userId: "user1",
      date: "2024-06-01",
      onStartWorkout: vi.fn(),
    };
    return render(
      <Wrapper client={queryClient}>
        <WorkoutRecommendation {...defaultProps} {...props} />
      </Wrapper>
    );
  };

  // =========================================================================
  // 1. Loading skeleton while fetch is pending (Req 8.5)
  // =========================================================================
  it("renders loading skeleton with aria-busy while fetch is pending", () => {
    // Never-resolving promise keeps the component in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderComponent();

    // The skeleton wrapper has aria-busy="true"
    const skeleton = document.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeTruthy();
    // And it contains animate-pulse elements
    const pulsing = document.querySelector(".animate-pulse");
    expect(pulsing).toBeTruthy();
  });

  // =========================================================================
  // 2. Error banner with retry button when fetch fails (Req 8.6)
  // =========================================================================
  it("renders error banner with retry button when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Service unavailable",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/service unavailable/i);
    expect(
      screen.getByRole("button", { name: /retry/i })
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 3. Empty state when response has no exercises
  // =========================================================================
  it("renders empty state when response has no exercises", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recommended_exercises: [],
        plan_metadata: {
          total_exercises: 0,
          estimated_duration_minutes: 0,
          focus_areas: [],
        },
      }),
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/no recommendation available/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Displays plan metadata — duration and focus areas (Req 6.4)
  // =========================================================================
  it("displays estimated duration and focus areas from plan metadata", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderComponent();

    await waitFor(() => {
      // ~45 min duration shown via aria-label
      expect(
        screen.getByLabelText(/estimated duration: 45 minutes/i)
      ).toBeInTheDocument();
    });

    // Focus areas shown in the metadata header aria-label span
    expect(
      screen.getByLabelText(/focus areas: chest, legs/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 5. Displays exercise names, sets×reps, and suggested weight (Req 6.4)
  // =========================================================================
  it("displays exercise names, sets × reps, and suggested weight for each exercise", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderComponent();

    await waitFor(() => {
      // Formatted exercise names (underscores → spaces, title case)
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
      expect(screen.getByText("Squat")).toBeInTheDocument();
    });

    // sets × reps for bench press: 3 × 10
    expect(screen.getByText("3 × 10")).toBeInTheDocument();
    // sets × reps for squat: 3 × 8
    expect(screen.getByText("3 × 8")).toBeInTheDocument();

    // Suggested weights
    expect(screen.getByText(/82\.5 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/97\.5 kg/i)).toBeInTheDocument();
  });

  // =========================================================================
  // 6. Displays rationale text for each exercise (Req 6.4)
  // =========================================================================
  it("displays rationale text for each recommended exercise", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/increase from 80\.0kg/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/maintain at 97\.5kg/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 7. Muscle group badge rendered with correct text
  // =========================================================================
  it("renders muscle group badges with correct labels", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderComponent();

    await waitFor(() => {
      // aria-label attributes on the badges
      expect(
        screen.getByLabelText(/muscle group: chest/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/muscle group: legs/i)
      ).toBeInTheDocument();
    });

    // Badge text content (formatted)
    expect(screen.getByLabelText(/muscle group: chest/i)).toHaveTextContent(
      "Chest"
    );
    expect(screen.getByLabelText(/muscle group: legs/i)).toHaveTextContent(
      "Legs"
    );
  });

  // =========================================================================
  // 8. Start Workout button calls onStartWorkout("recommendation")
  // =========================================================================
  it('Start Workout button calls onStartWorkout with "recommendation"', async () => {
    const onStartWorkout = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderComponent({ onStartWorkout });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /start workout/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /start workout/i }));

    expect(onStartWorkout).toHaveBeenCalledTimes(1);
    expect(onStartWorkout).toHaveBeenCalledWith("recommendation");
  });

  // =========================================================================
  // 9. Retry button in error banner triggers a refetch (Req 8.6)
  // =========================================================================
  it("retry button in error banner triggers a refetch", async () => {
    // First call fails, second call succeeds
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "Network error",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    renderComponent();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    // After retry, exercises should be displayed
    await waitFor(() => {
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
