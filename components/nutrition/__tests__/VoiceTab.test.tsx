// @vitest-environment jsdom
/**
 * Unit tests for VoiceTab — example-based (not property-based)
 *
 * Tests:
 *  1. Fallback message shown when SpeechRecognition is unavailable (Requirement 4.5)
 *  2. Mic button shown when speech recognition IS available (Requirement 4.5)
 *  3. Error message for 'not-allowed' speech error event (Requirement 4.6)
 *  4. Error message for 'no-speech' speech error event (Requirement 4.6)
 *
 * Validates: Requirements 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mock framer-motion to avoid animation issues in jsdom ────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(
      (
        { children, onClick, className, animate: _a, transition: _t, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { animate?: unknown; transition?: unknown },
        ref: React.Ref<HTMLButtonElement>,
      ) => (
        <button ref={ref} onClick={onClick} className={className} {...rest}>
          {children}
        </button>
      ),
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Import component under test ───────────────────────────────────────────────
import VoiceTab from '@/components/nutrition/tabs/VoiceTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

const DEFAULT_PROPS = {
  userId: 'user-test-123',
  mealType: 'lunch' as const,
  date: '2024-01-15',
  isActive: true,
  onSuccess: vi.fn(),
  resetKey: 0,
};

// ── SpeechRecognition mock factory ────────────────────────────────────────────

/**
 * Creates a mock SpeechRecognition constructor.
 * Exposes `triggerError(error)` on instances so tests can fire onerror events.
 */
function makeMockSpeechRecognition() {
  const instances: MockSpeechRecognitionInstance[] = [];

  class MockSpeechRecognitionInstance {
    continuous = false;
    interimResults = false;
    lang = '';

    onresult: ((e: SpeechRecognitionEvent) => void) | null = null;
    onspeechend: (() => void) | null = null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null = null;
    onend: (() => void) | null = null;

    start = vi.fn();
    stop = vi.fn();

    /** Test helper: dispatch a speech recognition error event */
    triggerError(error: string) {
      this.onerror?.({ error } as SpeechRecognitionErrorEvent);
    }
  }

  const Constructor = vi.fn().mockImplementation(() => {
    const instance = new MockSpeechRecognitionInstance();
    instances.push(instance);
    return instance;
  });

  return { Constructor, instances };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('VoiceTab — browser support fallback (Requirement 4.5)', () => {
  beforeEach(() => {
    // Ensure SpeechRecognition is NOT available
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the fallback message when SpeechRecognition is not available', () => {
    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    expect(
      screen.getByText(
        'Voice input is not supported in this browser. Please use the Describe tab instead.',
      ),
    ).toBeInTheDocument();
  });

  it('does NOT render the mic button when SpeechRecognition is unavailable', () => {
    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    // Mic button has aria-label "Start recording" — it must not be present
    expect(screen.queryByLabelText('Start recording')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Stop recording')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VoiceTab — mic button visible when speech recognition is available (Requirement 4.5)', () => {
  let recognition: ReturnType<typeof makeMockSpeechRecognition>;

  beforeEach(() => {
    recognition = makeMockSpeechRecognition();
    vi.stubGlobal('SpeechRecognition', recognition.Constructor);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the mic button when SpeechRecognition is available', () => {
    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Start recording')).toBeInTheDocument();
  });

  it('does NOT show the unsupported fallback message when SpeechRecognition is available', () => {
    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    expect(
      screen.queryByText(
        'Voice input is not supported in this browser. Please use the Describe tab instead.',
      ),
    ).not.toBeInTheDocument();
  });

  it('also uses webkitSpeechRecognition as a fallback when SpeechRecognition is absent', () => {
    vi.unstubAllGlobals();
    const webkitRecognition = makeMockSpeechRecognition();
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', webkitRecognition.Constructor);

    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Start recording')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VoiceTab — speech recognition error states (Requirement 4.6)', () => {
  let recognition: ReturnType<typeof makeMockSpeechRecognition>;

  beforeEach(() => {
    recognition = makeMockSpeechRecognition();
    vi.stubGlobal('SpeechRecognition', recognition.Constructor);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function startRecordingAndTriggerError(error: string) {
    const { Wrapper } = makeWrapper();
    render(<VoiceTab {...DEFAULT_PROPS} />, { wrapper: Wrapper });

    // Click the mic button to start recording
    const micBtn = screen.getByLabelText('Start recording');
    fireEvent.click(micBtn);

    // Confirm recognition was started
    await waitFor(() => expect(recognition.Constructor).toHaveBeenCalledTimes(1));
    const instance = recognition.instances[0];
    expect(instance.start).toHaveBeenCalledTimes(1);

    // Trigger the error event
    act(() => {
      instance.triggerError(error);
    });
  }

  it('displays "Microphone permission denied" error for the not-allowed event', async () => {
    await startRecordingAndTriggerError('not-allowed');

    await waitFor(() =>
      expect(
        screen.getByText(
          'Microphone permission denied. Please allow microphone access and try again.',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('displays "No speech detected" error for the no-speech event', async () => {
    await startRecordingAndTriggerError('no-speech');

    await waitFor(() =>
      expect(screen.getByText('No speech detected. Please try again.')).toBeInTheDocument(),
    );
  });

  it('error message has role="alert" for accessibility', async () => {
    await startRecordingAndTriggerError('not-allowed');

    await waitFor(() => {
      const alertEl = screen.getByRole('alert');
      expect(alertEl).toBeInTheDocument();
      expect(alertEl.textContent).toBeTruthy();
    });
  });

  it('shows a generic error message for unknown speech errors', async () => {
    await startRecordingAndTriggerError('network');

    await waitFor(() =>
      expect(
        screen.getByText('Voice recognition failed. Please try again.'),
      ).toBeInTheDocument(),
    );
  });

  it('allows the user to retry after an error (mic button still interactive)', async () => {
    await startRecordingAndTriggerError('no-speech');

    // After error, the mic button should reappear in a state that allows retry
    // The component transitions to 'error' state where the button label is "Record again"
    // or falls back to "Start recording" depending on the state
    await waitFor(() => {
      // The error message should be visible
      expect(screen.getByText('No speech detected. Please try again.')).toBeInTheDocument();
    });

    // The mic button should still be rendered and clickable (allows retry)
    // In error state the mic button onClick resets and starts recording
    const micBtn =
      screen.queryByLabelText('Start recording') ??
      screen.queryByLabelText('Record again') ??
      screen.queryByLabelText('Stop recording');
    expect(micBtn).toBeInTheDocument();
  });
});
