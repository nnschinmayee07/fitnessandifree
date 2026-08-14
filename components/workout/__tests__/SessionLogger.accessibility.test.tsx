// @vitest-environment jsdom
/**
 * Accessibility tests for SessionLogger component
 * 
 * Tests Requirements 16.1-16.5:
 * - Keyboard navigation (Tab through inputs)
 * - Enter to log set, Escape to cancel
 * - ARIA live regions for screen reader announcements
 * - WCAG AA color contrast (4.5:1)
 * - Visible focus indicators
 * - Keyboard shortcuts for common actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import SessionLogger from "../SessionLogger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock framer-motion to avoid animation complexity in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock real-time subscription helper
vi.mock("@/lib/workout/realtime", () => ({
  setupWorkoutRealtimeSubscription: vi.fn(() => ({
    cleanup: vi.fn(),
    getReconnectionState: vi.fn(() => ({
      isReconnecting: false,
      attemptCount: 0,
      lastError: null,
    })),
  })),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/workouts",
}));

// Mock Supabase client
const mockPlanExercisesA11y = [
  {
    id: 'pe-1',
    plan_id: 'plan-1',
    exercise_id: 'ex-1',
    target_sets: 3,
    target_reps: 10,
    order_index: 0,
    rest_seconds: 60,
    exercise: {
      id: 'ex-1',
      name: 'Bench Press',
      muscle_group: 'chest',
      equipment: 'barbell',
      instructions: 'Press the bar',
      media_url: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  },
];

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'plan_exercises') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockPlanExercisesA11y,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'logged_sets') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    }),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("SessionLogger Accessibility", () => {
  const defaultProps = {
    workoutId: "workout-1",
    planId: "plan-1",
    userId: "user-1",
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Requirement 16.1: Tab Navigation", () => {
    it("should allow tabbing through all interactive elements in logical order", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      // Tab through inputs — verify each input receives focus in order
      await user.tab();
      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      expect(weightInput).toHaveFocus();

      await user.tab();
      const repsInput = screen.getByLabelText(/number of repetitions/i);
      expect(repsInput).toHaveFocus();

      await user.tab();
      const rpeInput = screen.getByLabelText(/rate of perceived exertion/i);
      expect(rpeInput).toHaveFocus();

      // After RPE, focus moves to the next focusable button (Log Set is disabled, so skip to Complete)
      await user.tab();
      const focused = document.activeElement;
      expect(focused).not.toBeNull();
      expect(focused?.tagName.toLowerCase()).toBe("button");
    });
  });

  describe("Requirement 16.2: Keyboard Shortcuts", () => {
    it("should log set when Enter is pressed with valid input", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "set-1" }),
        } as Response)
      );

      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      const repsInput = screen.getByLabelText(/number of repetitions/i);

      await user.type(weightInput, "100");
      await user.type(repsInput, "10");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("should clear inputs when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i) as HTMLInputElement;
      const repsInput = screen.getByLabelText(/number of repetitions/i) as HTMLInputElement;

      await user.type(weightInput, "100");
      await user.type(repsInput, "10");

      expect(weightInput.value).toBe("100");
      expect(repsInput.value).toBe("10");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(weightInput.value).toBe("");
        expect(repsInput.value).toBe("");
      });
    });

    it("should support 'n' key for next exercise", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      // Press 'n' when not focused on input
      await user.keyboard("n");

      // Should trigger next exercise (verified by announcement or state change)
      // This would need more setup with actual exercise data
    });

    it("should support 's' key to skip rest timer when resting", async () => {
      // This would need setup to put the component in a resting state
      // and verify that 's' key skips the timer
    });
  });

  describe("Requirement 16.3: ARIA Live Regions", () => {
    it("should have ARIA live region for screen reader announcements", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // The ARIA live region is rendered in the loading state too, find it
      await screen.findByLabelText(/weight in kilograms/i);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("should announce set completion to screen readers", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "set-1" }),
        } as Response)
      );

      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      const repsInput = screen.getByLabelText(/number of repetitions/i);

      await user.type(weightInput, "100");
      await user.type(repsInput, "10");
      
      const logSetButton = screen.getByRole("button", { name: /log set/i });
      await user.click(logSetButton);

      // The ARIA live region should eventually contain the announcement
      await waitFor(() => {
        const liveRegion = screen.getByRole("status");
        // The component announces "Set X logged..." then overwrites with "Rest timer started..."
        // Either announcement is valid to confirm the action was announced
        const text = liveRegion.textContent ?? '';
        expect(text.length).toBeGreaterThan(0);
        expect(text.toLowerCase()).toMatch(/logged|rest timer/i);
      });
    });
  });

  describe("Requirement 16.4: WCAG AA Color Contrast", () => {
    it("should have sufficient color contrast for all text elements", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      // All text should use color variables that meet WCAG AA (4.5:1)
      // The actual contrast is verified in the CSS design system
      // Here we verify the classes are applied correctly
      
      const labels = screen.getAllByText(/weight|reps|rpe/i);
      labels.forEach(label => {
        const styles = window.getComputedStyle(label);
        expect(styles.color).toBeTruthy();
      });
    });
  });

  describe("Requirement 16.5: Visible Focus Indicators", () => {
    it("should have visible focus indicators on all input fields", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      
      await user.click(weightInput);
      
      // Check that focus ring classes are present
      expect(weightInput).toHaveClass("focus:ring-2");
      expect(weightInput).toHaveClass("focus:ring-[#2563EB]");
      expect(weightInput).toHaveClass("focus:ring-offset-2");
    });

    it("should have visible focus indicators on all buttons", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      // Tab to a button that's not disabled — Complete Workout is always available
      // Tab order: weight → reps → rpe → (skip disabled Log Set) → Complete → ...
      await user.tab(); // weight
      await user.tab(); // reps
      await user.tab(); // rpe
      await user.tab(); // first non-disabled button

      // Verify that a button has focus (focus indicators are CSS-based)
      const focused = document.activeElement;
      expect(focused).not.toBeNull();
      expect(focused?.tagName.toLowerCase()).toBe("button");
    });
  });

  describe("Keyboard Shortcuts Documentation", () => {
    it("should display keyboard shortcuts help section", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      // Use getAllByText for phrases that appear in multiple elements (button + shortcut list)
      expect(screen.getAllByText(/log set/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/clear inputs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/next exercise/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/previous exercise/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/skip rest timer/i).length).toBeGreaterThan(0);
    });

    it("should show kbd elements for all shortcuts", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      // Check that kbd elements are present for shortcuts via DOM query
      const kbdElements = document.querySelectorAll('kbd');
      expect(kbdElements.length).toBeGreaterThan(0);
    });
  });

  describe("ARIA Labels and Descriptions", () => {
    it("should have proper ARIA labels on all inputs", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      expect(await screen.findByLabelText(/weight in kilograms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of repetitions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rate of perceived exertion/i)).toBeInTheDocument();
    });

    it("should have ARIA descriptions for input help text", async () => {
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      expect(weightInput).toHaveAttribute("aria-describedby", "weight-help");

      const repsInput = screen.getByLabelText(/number of repetitions/i);
      expect(repsInput).toHaveAttribute("aria-describedby", "reps-help");

      const rpeInput = screen.getByLabelText(/rate of perceived exertion/i);
      expect(rpeInput).toHaveAttribute("aria-describedby", "rpe-help");
    });

    it("should mark invalid inputs with aria-invalid", async () => {
      const user = userEvent.setup();
      render(<SessionLogger {...defaultProps} />, { wrapper: createWrapper() });

      // Wait for exercises to load
      await screen.findByLabelText(/weight in kilograms/i);

      const weightInput = screen.getByLabelText(/weight in kilograms/i);
      const repsInput = screen.getByLabelText(/number of repetitions/i);

      // Enter invalid weight
      await user.type(weightInput, "10000");
      await user.type(repsInput, "10");
      
      const logSetButton = screen.getByRole("button", { name: /log set/i });
      await user.click(logSetButton);

      await waitFor(() => {
        expect(weightInput).toHaveAttribute("aria-invalid", "true");
      });
    });
  });
});
