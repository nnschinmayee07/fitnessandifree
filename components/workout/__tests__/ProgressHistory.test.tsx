// @vitest-environment jsdom

/**
 * Component tests for ProgressHistory
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.5, 8.6
 *
 * Task: 12.3 Write component tests for ProgressHistory
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import ProgressHistory from "../ProgressHistory";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Lazy imports so mocks are registered first
// ---------------------------------------------------------------------------
import { createClient } from "@/lib/supabase/client";

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
// Mock data — dates relative to today so chart tests work regardless of run date
// ---------------------------------------------------------------------------

const today = new Date().toISOString().split("T")[0];
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const mockWorkouts = [
  {
    id: "wo1",
    date: today,
    plan_name: "Push Day A",
    duration_seconds: 3600,
    total_volume: 5000,
    set_count: 12,
    status: "completed",
  },
  {
    id: "wo2",
    date: lastWeek,
    plan_name: "Pull Day B",
    duration_seconds: null,
    total_volume: 3500,
    set_count: 9,
    status: "completed",
  },
  {
    id: "wo3",
    date: today,
    plan_name: "Leg Day",
    duration_seconds: 2700,
    total_volume: 0,
    set_count: 0,
    status: "in_progress",
  },
];

// Only completed workouts (wo1 and wo2)
const completedWorkouts = mockWorkouts.filter(
  (w) => w.status === "completed"
);

const mockSets = [
  {
    id: "s1",
    workout_log_id: "wo1",
    exercise_id: "ex1",
    set_number: 1,
    weight_kg: 100,
    reps: 5,
    rpe: 8,
    logged_at: new Date().toISOString(),
    exercises: { name: "Bench Press" },
  },
  {
    id: "s2",
    workout_log_id: "wo1",
    exercise_id: "ex1",
    set_number: 2,
    weight_kg: 105,
    reps: 3,
    rpe: 9,
    logged_at: new Date().toISOString(),
    exercises: { name: "Bench Press" },
  },
];

/** Build a mock supabase client for logged_sets queries */
function buildMockSupabase(sets: any[] = mockSets, error: any = null) {
  const mockSupabase: any = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "logged_sets") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: sets, error }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    }),
  };
  return mockSupabase;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

describe("ProgressHistory", () => {
  let queryClient: QueryClient;
  let mockFetch: Mock;

  beforeEach(() => {
    queryClient = createMockQueryClient();
    vi.clearAllMocks();

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Default: supabase returns mock sets
    (createClient as Mock).mockReturnValue(buildMockSupabase());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderHistory = (
    props: Partial<React.ComponentProps<typeof ProgressHistory>> = {}
  ) => {
    const defaultProps = { userId: "user1" };
    return render(
      <Wrapper client={queryClient}>
        <ProgressHistory {...defaultProps} {...props} />
      </Wrapper>
    );
  };

  // =========================================================================
  // 1. Loading skeleton while fetching
  // =========================================================================
  it("renders loading skeleton while fetch is pending (Req 8.5)", () => {
    // Return a promise that never resolves
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    renderHistory();

    // The skeleton has aria-busy="true"
    const skeleton = document.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeTruthy();

    // Skeleton has animate-pulse class
    const pulse = document.querySelector(".animate-pulse");
    expect(pulse).toBeTruthy();
  });

  // =========================================================================
  // 2. Error banner with retry button when fetch fails
  // =========================================================================
  it("renders error banner with retry button when fetch fails (Req 8.6)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Internal Server Error",
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Error message contains the server error text
    expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i);

    // Retry button present
    expect(
      screen.getByRole("button", { name: /retry/i })
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 3. Empty state when no completed workouts
  // =========================================================================
  it("renders empty state when there are no completed workouts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(
        screen.getByText(/no workout history yet/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Renders list of completed sessions with date, plan name, volume
  // =========================================================================
  it("renders list of completed sessions with date, plan name, and volume (Req 5.1)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: mockWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // Second completed workout is also shown
    expect(screen.getByText("Pull Day B")).toBeInTheDocument();

    // Volume formatted: 5000 kg → "5.0t" (appears in session row aria-label)
    expect(
      screen.getByLabelText(/total volume: 5\.0t/i)
    ).toBeInTheDocument();

    // Volume formatted: 3500 kg → "3.5t"
    expect(
      screen.getByLabelText(/total volume: 3\.5t/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 5. In-progress sessions are filtered out (Req 5.1 - only completed shown)
  // =========================================================================
  it("filters out in-progress sessions and shows only completed ones", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: mockWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // "Leg Day" is in_progress — should NOT appear
    expect(screen.queryByText("Leg Day")).not.toBeInTheDocument();
  });

  // =========================================================================
  // 6. Volume chart shown when ≥ 2 weeks have workout data (Req 5.6)
  // =========================================================================
  it("shows volume chart when workouts span ≥ 2 different weeks (Req 5.6)", async () => {
    // wo1 = this week, wo2 = last week → 2 distinct weeks with non-zero volume
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: completedWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // VolumeChart renders when ≥2 non-zero volume points exist
    expect(
      screen.getByLabelText(/volume over the last 12 weeks/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // 7. Volume chart NOT shown when only 1 week has data (Req 5.6)
  // =========================================================================
  it("does not show volume chart when only 1 week has workout data (Req 5.6)", async () => {
    // Both workouts on same day (this week) → only 1 week with non-zero volume
    const sameWeekWorkouts = [
      { ...mockWorkouts[0], id: "wo1", total_volume: 5000 },
      {
        ...mockWorkouts[0],
        id: "wo4",
        plan_name: "Push Day B",
        total_volume: 4000,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: sameWeekWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // Chart should NOT be shown (only 1 non-zero week)
    expect(
      screen.queryByLabelText(/volume over the last 12 weeks/i)
    ).not.toBeInTheDocument();
  });

  // =========================================================================
  // 8. Click on session row expands it and fetches sets from Supabase (Req 5.2)
  // =========================================================================
  it("expands session row on click and fetches sets from Supabase (Req 5.2)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [mockWorkouts[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // Click the session row button to expand
    const expandButton = screen.getByRole("button", {
      name: /expand workout/i,
    });
    fireEvent.click(expandButton);

    // Supabase should be queried for the sets
    await waitFor(() => {
      expect(createClient).toHaveBeenCalled();
      const mockSb = (createClient as Mock).mock.results[0].value;
      expect(mockSb.from).toHaveBeenCalledWith("logged_sets");
    });
  });

  // =========================================================================
  // 9. Expanded session shows exercise name, weight×reps, RPE (Req 5.2)
  // =========================================================================
  it("expanded session displays exercise name, weight×reps, and RPE (Req 5.2)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [mockWorkouts[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // Expand the session
    fireEvent.click(screen.getByRole("button", { name: /expand workout/i }));

    // Wait for sets to render
    await waitFor(() => {
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
    });

    // Weight × reps shown for first set (100 kg × 5)
    expect(screen.getByText(/100 kg × 5/)).toBeInTheDocument();

    // RPE shown
    expect(screen.getByText(/RPE 8/)).toBeInTheDocument();
  });

  // =========================================================================
  // 10. 1RM estimate shown for sets with reps 1-10 (Req 5.4)
  //     e.g., bench 100 kg × 5 → Epley: 100 * (1 + 5/30) = 116.67
  // =========================================================================
  it("shows 1RM estimate for sets with reps between 1 and 10 (Req 5.4)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [mockWorkouts[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /expand workout/i }));

    await waitFor(() => {
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
    });

    // 100 kg × 5 reps → Epley 1RM = 100 * (1 + 5/30) = 116.67
    expect(screen.getByText(/~116\.7 kg 1RM/)).toBeInTheDocument();

    // 105 kg × 3 reps → Epley 1RM = 105 * (1 + 3/30) = 115.5
    expect(screen.getByText(/~115\.5 kg 1RM/)).toBeInTheDocument();
  });

  // =========================================================================
  // 11. PR badge shown on highest-weight set per exercise (Req 5.5)
  // =========================================================================
  it("shows PR badge on the highest-weight set for an exercise (Req 5.5)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [mockWorkouts[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /expand workout/i }));

    await waitFor(() => {
      expect(screen.getByText("Bench Press")).toBeInTheDocument();
    });

    // There should be exactly one PR badge (for the 105 kg set — highest weight)
    const prBadges = screen.getAllByText(/🏆 PR/);
    expect(prBadges).toHaveLength(1);

    // The PR badge should be on the 105 kg set (aria-label check)
    const prBadge = prBadges[0];
    expect(prBadge).toHaveAttribute("aria-label", "Personal record");

    // The set with 100 kg does NOT have a PR badge
    const set100 = screen.getByRole("listitem", {
      name: /set 1: 100 kg × 5 reps/i,
    });
    expect(set100).not.toHaveTextContent("🏆 PR");
  });

  // =========================================================================
  // 12. exerciseFilter prop filters sessions by plan_name (Req 5.2)
  // =========================================================================
  it("exerciseFilter prop filters sessions to matching plan_name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: completedWorkouts }),
    });

    renderHistory({ exerciseFilter: "Push" });

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // "Pull Day B" does NOT match "Push" filter
    expect(screen.queryByText("Pull Day B")).not.toBeInTheDocument();
  });

  // =========================================================================
  // 13. Retry button refetches data (Req 8.6)
  // =========================================================================
  it("retry button in error banner triggers a refetch", async () => {
    // First call: fail
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Server error",
    });
    // Second call: succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: [mockWorkouts[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    // After retry succeeds, the workout list should appear
    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // =========================================================================
  // 14. Duration displayed correctly (Req 5.1) — "1h" for 3600s, "—" for null
  // =========================================================================
  it("displays duration formatted correctly and '—' when duration is null (Req 5.1)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: completedWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // wo1 has duration_seconds=3600 → "60m"
    expect(screen.getByLabelText(/duration: 60m/i)).toBeInTheDocument();

    // wo2 has duration_seconds=null → "—"
    expect(screen.getByLabelText(/duration: —/i)).toBeInTheDocument();
  });

  // =========================================================================
  // 15. Set count shown in session row (Req 5.1)
  // =========================================================================
  it("displays set count in each completed session row (Req 5.1)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workouts: completedWorkouts }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Push Day A")).toBeInTheDocument();
    });

    // wo1 has 12 sets
    expect(screen.getByLabelText(/12 sets completed/i)).toBeInTheDocument();

    // wo2 has 9 sets
    expect(screen.getByLabelText(/9 sets completed/i)).toBeInTheDocument();
  });
});
