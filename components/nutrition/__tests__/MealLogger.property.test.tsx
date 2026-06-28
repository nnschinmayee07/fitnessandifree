// @vitest-environment jsdom
// Feature: food-recognition-ml, Property 5: MealLogger button state tracks image selection

/**
 * Property 5: MealLogger button state tracks image selection
 * Validates: Requirements 6.3, 6.4
 *
 * - button `disabled` iff no image selected
 * - preview rendered iff image selected
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MealLogger from '../MealLogger';

// ── Mock browser APIs not available in jsdom ──────────────────────────────────
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

// ── Test wrapper ─────────────────────────────────────────────────────────────
// MealLogger calls useQueryClient() (added in task 11.6) so every render
// must be wrapped in a QueryClientProvider.
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

function renderWithClient(ui: React.ReactElement) {
  const { Wrapper } = makeWrapper();
  return render(ui, { wrapper: Wrapper });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create a File object with the given name and MIME type. */
function makeImageFile(name: string, type = 'image/jpeg'): File {
  return new File(['(binary)'], name, { type });
}

// ── Example-based tests ───────────────────────────────────────────────────────

describe('MealLogger — button and preview state (example-based)', () => {
  it('renders with button disabled and no preview on initial render', () => {
    renderWithClient(<MealLogger userId="user-123" />);

    const button = screen.getByTestId('analyse-btn');
    expect(button).toBeDisabled();
    expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
  });

  it('enables button and shows preview after a file is selected', async () => {
    renderWithClient(<MealLogger userId="user-123" />);

    const input = screen.getByTestId('camera-input');
    const file = makeImageFile('meal.jpg');

    await userEvent.upload(input, file);

    const button = screen.getByTestId('analyse-btn');
    await waitFor(() => expect(button).not.toBeDisabled());

    const preview = screen.getByTestId('image-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'blob:mock-url');
  });
});

// ── Property-based test ───────────────────────────────────────────────────────

describe('MealLogger — Property 5: button state tracks image selection', () => {
  it('button enabled and preview present for any image file name/type', async () => {
    // Arbitraries for file names and MIME types
    const fileNameArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9_-]{1,20}$/),
        fc.constantFrom('jpg', 'png', 'webp'),
      )
      .map(([base, ext]) => `${base}.${ext}`);

    const mimeTypeArb = fc.constantFrom(
      'image/jpeg',
      'image/png',
      'image/webp',
    );

    await fc.assert(
      fc.asyncProperty(fileNameArb, mimeTypeArb, async (fileName, mimeType) => {
        const { unmount } = renderWithClient(<MealLogger userId="user-prop-test" />);

        const input = screen.getByTestId('camera-input');
        const file = makeImageFile(fileName, mimeType);

        await userEvent.upload(input, file);

        const button = screen.getByTestId('analyse-btn');
        await waitFor(() => expect(button).not.toBeDisabled(), { timeout: 1000 });

        const preview = screen.getByTestId('image-preview');
        expect(preview).toBeInTheDocument();

        unmount();
      }),
      { numRuns: 25, verbose: true },
    );
  });
});

// ── Property 6 ────────────────────────────────────────────────────────────────
// Feature: food-recognition-ml, Property 6: MealLogger renders complete macro breakdown for any valid API response

/**
 * Property 6: MealLogger renders complete macro breakdown for any valid API response
 * Validates: Requirements 6.6
 *
 * For any valid API response (food name, confidence in [50,100], macros), the component
 * must render: food-name, confidence-badge with a number in [0,100], and macro-breakdown
 * containing all five macro values.
 */

describe('MealLogger — Property 6: complete macro breakdown rendering', () => {
  it('renders food name, confidence badge, and all macro values for any valid API response', async () => {
    const macroArb = fc.record({
      calories: fc.float({ min: 0, max: 2000, noNaN: true }),
      protein_g: fc.float({ min: 0, max: 200, noNaN: true }),
      carbs_g: fc.float({ min: 0, max: 400, noNaN: true }),
      fat_g: fc.float({ min: 0, max: 200, noNaN: true }),
      fiber_g: fc.float({ min: 0, max: 100, noNaN: true }),
    });

    const apiResponseArb = fc.record({
      food: fc.stringMatching(/^[a-z_]{3,20}$/),
      confidence: fc.float({ min: 50, max: 100, noNaN: true }).map((v) => v.toFixed(2)),
      top3: fc.array(
        fc.record({
          name: fc.constant('pizza'),
          confidence: fc.constant('87.00'),
        }),
        { minLength: 3, maxLength: 3 },
      ),
      macros: macroArb,
    });

    await fc.assert(
      fc.asyncProperty(apiResponseArb, async (apiResponse) => {
        // Mock fetch to return the generated API response
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            json: async () => apiResponse,
          } as Response),
        );

        const { unmount } = renderWithClient(<MealLogger userId="user-prop6-test" />);

        // Upload a file to enable the Analyse Meal button
        const input = screen.getByTestId('camera-input');
        const file = makeImageFile('meal.jpg', 'image/jpeg');
        await userEvent.upload(input, file);

        // Wait for the button to be enabled
        const button = screen.getByTestId('analyse-btn');
        await waitFor(() => expect(button).not.toBeDisabled(), { timeout: 1000 });

        // Click Analyse Meal
        await userEvent.click(button);

        // Wait for the result section — food-name is rendered only when result is set
        await waitFor(
          () => expect(screen.getByTestId('food-name')).toBeInTheDocument(),
          { timeout: 3000 },
        );

        // Assert food name is present
        const foodNameEl = screen.getByTestId('food-name');
        expect(foodNameEl).toBeInTheDocument();
        const expectedFoodDisplay = apiResponse.food.replace(/_/g, ' ');
        expect(foodNameEl.textContent).toBe(expectedFoodDisplay);

        // Assert confidence badge shows a whole number in [0, 100]
        const badgeEl = screen.getByTestId('confidence-badge');
        expect(badgeEl).toBeInTheDocument();
        const badgeText = badgeEl.textContent ?? '';
        const badgeNumber = parseInt(badgeText.replace('%', '').trim(), 10);
        expect(badgeNumber).toBeGreaterThanOrEqual(0);
        expect(badgeNumber).toBeLessThanOrEqual(100);

        // Assert macro breakdown is present and contains all five macro values
        const macroEl = screen.getByTestId('macro-breakdown');
        expect(macroEl).toBeInTheDocument();
        const macroText = macroEl.textContent ?? '';
        // Each macro value should appear somewhere in the breakdown text
        expect(macroText).toContain(String(apiResponse.macros.calories));
        expect(macroText).toContain(String(apiResponse.macros.protein_g));
        expect(macroText).toContain(String(apiResponse.macros.carbs_g));
        expect(macroText).toContain(String(apiResponse.macros.fat_g));
        expect(macroText).toContain(String(apiResponse.macros.fiber_g));

        unmount();
        vi.unstubAllGlobals();
      }),
      { numRuns: 20, verbose: true },
    );
  });
});


// Feature: food-recognition-ml, Property 7: Low-confidence responses always render Top3 selectable alternatives

/**
 * Property 7: Low-confidence responses always render Top3 selectable alternatives
 * Validates: Requirements 6.7
 *
 * For any API response where `low_confidence: true`, the MealLogger renders all
 * three alternatives from `top3` as individually selectable buttons, and the
 * "Log Meal" button is NOT yet visible (requires a Top3 selection first).
 */

// ── Arbitraries ───────────────────────────────────────────────────────────────

const top3ItemArb = fc.record({
  name: fc.stringMatching(/^[a-z_]{3,20}$/),
  confidence: fc.float({ min: 0, max: Math.fround(50), noNaN: true }).map((v) => v.toFixed(2)),
});

const lowConfResponseArb = fc.record({
  food: fc.stringMatching(/^[a-z_]{3,20}$/),
  confidence: fc.float({ min: 0, max: Math.fround(49.99), noNaN: true }).map((v) => v.toFixed(2)),
  top3: fc.array(top3ItemArb, { minLength: 3, maxLength: 3 }),
  macros: fc.record({
    calories: fc.constant(200),
    protein_g: fc.constant(10),
    carbs_g: fc.constant(30),
    fat_g: fc.constant(8),
    fiber_g: fc.constant(2),
  }),
  low_confidence: fc.constant(true),
});

// ── Property 7 ────────────────────────────────────────────────────────────────

describe('MealLogger — Property 7: Low-confidence responses always render Top3 selectable alternatives', () => {
  it('renders exactly 3 selectable buttons in top3-list and no Log Meal button for any low_confidence response', async () => {
    await fc.assert(
      fc.asyncProperty(lowConfResponseArb, async (lowConfResponse) => {
        // Mock fetch to return this low_confidence response
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(lowConfResponse),
        } as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);

        const { unmount } = renderWithClient(<MealLogger userId="user-prop7-test" />);

        // Select a file so the Analyse button becomes enabled
        const input = screen.getByTestId('camera-input');
        await userEvent.upload(input, makeImageFile('food.jpg'));

        // Click Analyse Meal
        const analyseBtn = screen.getByTestId('analyse-btn');
        await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
        await userEvent.click(analyseBtn);

        // Wait for the top3-list to appear
        await waitFor(
          () => expect(screen.getByTestId('top3-list')).toBeInTheDocument(),
          { timeout: 2000 },
        );

        // 1. top3-list is in the document
        const top3List = screen.getByTestId('top3-list');
        expect(top3List).toBeInTheDocument();

        // 2. Exactly 3 clickable buttons inside the top3-list
        const buttons = top3List.querySelectorAll('button');
        expect(buttons).toHaveLength(3);

        // 3. "Log Meal" button is NOT present yet (requires Top3 selection first)
        expect(screen.queryByTestId('log-meal-btn')).not.toBeInTheDocument();

        vi.unstubAllGlobals();
        unmount();
      }),
      { numRuns: 20, verbose: true },
    );
  });
});


// Feature: food-recognition-ml, Property 8: Store update maps API response fields correctly

/**
 * Property 8: Store update maps API response fields correctly
 * Validates: Requirements 6.9
 *
 * For any generated ML response macro object, when the user clicks "Log Meal",
 * `addFood` must be called with exactly:
 *   { calories, protein: protein_g, carbs: carbs_g, fat: fat_g }
 */

import * as nutritionStore from '@/lib/store/nutrition';

describe('MealLogger — Property 8: Store update maps API response fields correctly', () => {
  it('calls addFood with correctly mapped fields for any macro values', async () => {
    // Arbitrary for macro values — use integer-like floats to avoid floating-point
    // string representation mismatches in the macro breakdown assertions.
    const macroArb = fc.record({
      calories: fc.integer({ min: 0, max: 2000 }).map(Number),
      protein_g: fc.integer({ min: 0, max: 200 }).map(Number),
      carbs_g: fc.integer({ min: 0, max: 400 }).map(Number),
      fat_g: fc.integer({ min: 0, max: 200 }).map(Number),
      fiber_g: fc.integer({ min: 0, max: 100 }).map(Number),
    });

    await fc.assert(
      fc.asyncProperty(macroArb, async (macros) => {
        const addFoodMock = vi.fn();

        // Spy on useNutritionStore and intercept the selector call.
        // MealLogger calls: const addFood = useNutritionStore((s) => s.addFood)
        // We replace the hook with a function that calls the given selector
        // against a fake store state containing our mock addFood.
        const storeSpy = vi.spyOn(nutritionStore, 'useNutritionStore').mockImplementation(
          // The selector overload: (selector) => selector(fakeState)
          // Cast needed because Zustand's typing is complex but the runtime call is simple.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((selector: (s: { addFood: typeof addFoodMock }) => unknown) =>
            selector({ addFood: addFoodMock })) as unknown as typeof nutritionStore.useNutritionStore,
        );

        // Build a high-confidence API response so no Top3 selection is required
        // before the Log Meal button appears.
        const apiResponse = {
          food: 'pizza',
          confidence: '87.50',
          top3: [
            { name: 'pizza', confidence: '87.50' },
            { name: 'burger', confidence: '7.00' },
            { name: 'salad', confidence: '5.50' },
          ],
          macros,
          // no low_confidence field → Log Meal button appears immediately after analysis
        };

        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            json: async () => apiResponse,
          } as Response),
        );

        const { container, unmount } = renderWithClient(<MealLogger userId="user-prop8-test" />);

        // Scope all queries to this component's container to avoid stale DOM from
        // other parallel renders in the same test run.
        const { getByTestId, findByTestId } = within(container);

        // Select a file
        const input = getByTestId('camera-input');
        await userEvent.upload(input, makeImageFile('food.jpg'));

        // Wait for button to enable, then click Analyse
        const analyseBtn = getByTestId('analyse-btn');
        await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
        await userEvent.click(analyseBtn);

        // Wait for result to appear (food-name rendered)
        await waitFor(
          () => expect(getByTestId('food-name')).toBeInTheDocument(),
          { timeout: 3000 },
        );

        // Log Meal button should be visible (no low_confidence)
        const logMealBtn = await findByTestId('log-meal-btn', {}, { timeout: 2000 });
        expect(logMealBtn).toBeInTheDocument();

        // Click Log Meal
        await userEvent.click(logMealBtn);

        // Assert addFood was called exactly once with the correct field mapping:
        // { calories, protein: protein_g, carbs: carbs_g, fat: fat_g }
        expect(addFoodMock).toHaveBeenCalledTimes(1);
        expect(addFoodMock).toHaveBeenCalledWith({
          calories: macros.calories,
          protein: macros.protein_g,
          carbs: macros.carbs_g,
          fat: macros.fat_g,
        });

        unmount();
        storeSpy.mockRestore();
        vi.unstubAllGlobals();
      }),
      { numRuns: 20, verbose: true },
    );
  });
});


// Feature: food-recognition-ml, Property 9: Successful log resets MealLogger to initial state

/**
 * Property 9: Successful log resets MealLogger to initial state
 * Validates: Requirements 6.11
 *
 * For any arbitrary image-selected → analysed → confirmed sequence, after clicking
 * "Log Meal" the component state must be identical to its initial state:
 *   - no image-preview element in the DOM
 *   - "Analyse Meal" button is disabled
 *   - no food-name element in the DOM
 *   - no macro-breakdown element in the DOM
 *   - no error element in the DOM
 */

describe('MealLogger — Property 9: Successful log resets MealLogger to initial state', () => {
  it('component state is identical to initial state after successful log for any macro combination', async () => {
    // Generate arbitrary (but valid) macro values for the analyse API response.
    // All float bounds use Math.fround() as required by fast-check.
    const macroArb = fc.record({
      calories: fc.float({ min: Math.fround(0), max: Math.fround(2000), noNaN: true }),
      protein_g: fc.float({ min: Math.fround(0), max: Math.fround(200), noNaN: true }),
      carbs_g: fc.float({ min: Math.fround(0), max: Math.fround(400), noNaN: true }),
      fat_g: fc.float({ min: Math.fround(0), max: Math.fround(200), noNaN: true }),
      fiber_g: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
    });

    // Full API response that is NOT low_confidence (Log Meal button appears immediately).
    const apiResponseArb = fc.record({
      food: fc.constantFrom('pizza', 'burger', 'salad', 'sushi', 'pasta'),
      // Confidence in the high-confidence range so low_confidence is absent
      confidence: fc
        .float({ min: Math.fround(50.01), max: Math.fround(99.99), noNaN: true })
        .map((v) => v.toFixed(2)),
      top3: fc.array(
        fc.record({
          name: fc.constant('pizza'),
          confidence: fc.constant('87.00'),
        }),
        { minLength: 3, maxLength: 3 },
      ),
      macros: macroArb,
      // low_confidence intentionally absent — ensures Log Meal button is visible right away
    });

    await fc.assert(
      fc.asyncProperty(apiResponseArb, async (apiResponse) => {
        // Mock fetch to return the generated API response for the analyse step.
        // useNutritionStore.addFood is the real Zustand store — it won't throw.
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: true,
            json: async () => apiResponse,
          } as unknown as Response),
        );

        // Render into a dedicated container so queries are scoped per iteration
        const container = document.createElement('div');
        document.body.appendChild(container);

        const { queryClient, Wrapper } = makeWrapper();
        const { unmount } = render(<MealLogger userId="user-prop9-test" />, {
          wrapper: Wrapper,
          container,
        });

        // Use `within` to scope all queries to this render's container
        const { getByTestId, queryByTestId } = await import('@testing-library/dom').then(
          (m) => ({ getByTestId: m.getByTestId.bind(null, container), queryByTestId: m.queryByTestId.bind(null, container) }),
        );

        // ── Step 1: select an image ────────────────────────────────────────────
        const input = getByTestId('camera-input');
        await userEvent.upload(input, makeImageFile('food.jpg', 'image/jpeg'));

        // Confirm preview shown and button enabled (pre-condition)
        const analyseBtn = getByTestId('analyse-btn');
        await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
        expect(queryByTestId('image-preview')).toBeInTheDocument();

        // ── Step 2: click Analyse Meal ─────────────────────────────────────────
        await userEvent.click(analyseBtn);

        // Wait until food-name appears (result rendered)
        await waitFor(
          () => expect(queryByTestId('food-name')).toBeInTheDocument(),
          { timeout: 3000 },
        );

        // Confirm Log Meal button is visible (non-low-confidence path)
        await waitFor(
          () => expect(queryByTestId('log-meal-btn')).toBeInTheDocument(),
          { timeout: 1000 },
        );

        // ── Step 3: click Log Meal ─────────────────────────────────────────────
        await userEvent.click(getByTestId('log-meal-btn'));

        // ── Assertions: component must be in initial state ─────────────────────

        // No image preview
        await waitFor(
          () => expect(queryByTestId('image-preview')).not.toBeInTheDocument(),
          { timeout: 2000 },
        );

        // Analyse button disabled (no image selected)
        expect(getByTestId('analyse-btn')).toBeDisabled();

        // No food-name (result cleared)
        expect(queryByTestId('food-name')).not.toBeInTheDocument();

        // No macro-breakdown
        expect(queryByTestId('macro-breakdown')).not.toBeInTheDocument();

        // No error message
        expect(queryByTestId('error-message')).not.toBeInTheDocument();

        // Log Meal button is gone
        expect(queryByTestId('log-meal-btn')).not.toBeInTheDocument();

        vi.unstubAllGlobals();
        unmount();
        document.body.removeChild(container);

        // Suppress unused variable warning for queryClient (kept for type correctness)
        void queryClient;
      }),
      { numRuns: 20, verbose: true },
    );
  });
});


// Feature: food-recognition-ml, Property 10: API errors preserve image and re-enable button

/**
 * Property 10: API errors preserve image and re-enable button
 * Validates: Requirements 6.12
 *
 * For any arbitrary 4xx/5xx error response, after clicking "Analyse Meal":
 *   - image-preview is still in the DOM (selectedFile retained)
 *   - analyse-btn is NOT disabled (re-enabled because disabled={!selectedFile})
 *   - error-message is in the DOM with non-empty text content
 */

describe('MealLogger — Property 10: API errors preserve image and re-enable button', () => {
  it('retains image preview, re-enables button, and shows non-empty error for any 4xx/5xx response', async () => {
    const errorStatusArb = fc.constantFrom(400, 401, 403, 404, 422, 500, 502, 503);
    const errorBodyArb = fc.string({ minLength: 1, maxLength: 100 });

    await fc.assert(
      fc.asyncProperty(errorStatusArb, errorBodyArb, async (errorStatus, errorBody) => {
        // Mock fetch to return a non-ok error response
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue({
            ok: false,
            status: errorStatus,
            text: async () => errorBody,
          } as unknown as Response),
        );

        // Render into a dedicated container to avoid stale DOM from parallel iterations
        const container = document.createElement('div');
        document.body.appendChild(container);

        const { Wrapper } = makeWrapper();
        const { unmount } = render(<MealLogger userId="user-prop10-test" />, {
          wrapper: Wrapper,
          container,
        });

        // Scope all queries to this render's container
        const { getByTestId, queryByTestId } = await import('@testing-library/dom').then(
          (m) => ({
            getByTestId: m.getByTestId.bind(null, container),
            queryByTestId: m.queryByTestId.bind(null, container),
          }),
        );

        // Upload a file to enable the Analyse button and show the preview
        const input = getByTestId('camera-input');
        await userEvent.upload(input, makeImageFile('meal.jpg', 'image/jpeg'));

        // Confirm preview and enabled button before clicking Analyse
        const analyseBtn = getByTestId('analyse-btn');
        await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
        expect(queryByTestId('image-preview')).toBeInTheDocument();

        // Click Analyse — fetch will return the error response
        await userEvent.click(analyseBtn);

        // 1. Image preview is still in the DOM
        await waitFor(
          () => expect(queryByTestId('image-preview')).toBeInTheDocument(),
          { timeout: 2000 },
        );

        // 2. Analyse button is re-enabled (selectedFile was retained)
        expect(getByTestId('analyse-btn')).not.toBeDisabled();

        // 3. Error message is rendered with non-empty text
        const errorEl = getByTestId('error-message');
        expect(errorEl).toBeInTheDocument();
        expect((errorEl.textContent ?? '').trim().length).toBeGreaterThan(0);

        vi.unstubAllGlobals();
        unmount();
        document.body.removeChild(container);
      }),
      { numRuns: 25, verbose: true },
    );
  });
});


// ── Task 11.11 — Example-based unit tests for MealLogger ─────────────────────
// Validates: Requirements 6.1, 6.5, 6.8, 6.10

describe('MealLogger — 11.11 example-based unit tests', () => {
  // ── 6.1: camera input has capture="environment" ─────────────────────────────
  it('camera input renders with capture="environment"', () => {
    renderWithClient(<MealLogger userId="user-ex1" />);

    const cameraInput = screen.getByTestId('camera-input');
    expect(cameraInput).toHaveAttribute('capture', 'environment');
  });

  // ── 6.5: spinner shown during pending request ────────────────────────────────
  it('shows spinner on the analyse button while the request is pending', async () => {
    // Mock fetch with a promise that never resolves — keeps the button in loading state
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise<Response>(() => {})),
    );

    renderWithClient(<MealLogger userId="user-ex2" />);

    // Select a file so the Analyse button becomes enabled
    const input = screen.getByTestId('camera-input');
    await userEvent.upload(input, makeImageFile('food.jpg'));

    const analyseBtn = screen.getByTestId('analyse-btn');
    await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });

    // Click Analyse Meal
    await userEvent.click(analyseBtn);

    // Button should now be disabled (loading=true) and show the spinner SVG
    await waitFor(() => expect(analyseBtn).toBeDisabled(), { timeout: 1000 });
    expect(within(analyseBtn).getByTestId('spinner')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  // ── 6.8: "Log Meal" button absent before result, present after ───────────────
  it('"Log Meal" button is absent before result and present after', async () => {
    const apiResponse = {
      food: 'pizza',
      confidence: '87.50',
      top3: [
        { name: 'pizza', confidence: '87.50' },
        { name: 'burger', confidence: '7.00' },
        { name: 'salad', confidence: '5.50' },
      ],
      macros: { calories: 300, protein_g: 12, carbs_g: 40, fat_g: 10, fiber_g: 3 },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      } as Response),
    );

    renderWithClient(<MealLogger userId="user-ex3" />);

    // Before analysis: no "Log Meal" button
    expect(screen.queryByTestId('log-meal-btn')).not.toBeInTheDocument();

    // Select a file and run analysis
    const input = screen.getByTestId('camera-input');
    await userEvent.upload(input, makeImageFile('food.jpg'));

    const analyseBtn = screen.getByTestId('analyse-btn');
    await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
    await userEvent.click(analyseBtn);

    // After result: "Log Meal" button appears
    await waitFor(
      () => expect(screen.getByTestId('log-meal-btn')).toBeInTheDocument(),
      { timeout: 3000 },
    );

    vi.unstubAllGlobals();
  });

  // ── 6.10: queryClient.invalidateQueries called on confirm ────────────────────
  it('calls queryClient.invalidateQueries({ queryKey: ["meal-logs"] }) when Log Meal is clicked', async () => {
    const apiResponse = {
      food: 'salad',
      confidence: '91.00',
      top3: [
        { name: 'salad', confidence: '91.00' },
        { name: 'caesar_salad', confidence: '5.00' },
        { name: 'greek_salad', confidence: '4.00' },
      ],
      macros: { calories: 150, protein_g: 5, carbs_g: 20, fat_g: 6, fiber_g: 4 },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      } as Response),
    );

    // Use makeWrapper() so we can spy on the queryClient instance
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    render(<MealLogger userId="user-ex4" />, { wrapper: Wrapper });

    // Select a file and run analysis
    const input = screen.getByTestId('camera-input');
    await userEvent.upload(input, makeImageFile('food.jpg'));

    const analyseBtn = screen.getByTestId('analyse-btn');
    await waitFor(() => expect(analyseBtn).not.toBeDisabled(), { timeout: 1000 });
    await userEvent.click(analyseBtn);

    // Wait for Log Meal button to appear
    await waitFor(
      () => expect(screen.getByTestId('log-meal-btn')).toBeInTheDocument(),
      { timeout: 3000 },
    );

    // Click Log Meal
    await userEvent.click(screen.getByTestId('log-meal-btn'));

    // Assert invalidateQueries was called with the correct query key
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['meal-logs'] });

    invalidateSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
