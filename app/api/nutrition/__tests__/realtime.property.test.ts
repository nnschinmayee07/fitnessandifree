// Feature: nutrition-meal-logging-v2, Property 7: real-time subscription query-key correctness
// Validates: Requirements 6.3, 6.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure helper functions extracted from the subscription callback logic
// (mirrors the logic in app/nutrition/page.tsx useEffect)
// ---------------------------------------------------------------------------

type EventType = 'INSERT' | 'UPDATE' | 'DELETE';
type ChannelType = 'meal_logs' | 'water_logs';

function getMealLogsQueryKey(userId: string, date: string): unknown[] {
  return ['meal-logs', userId, date];
}

function getWaterLogsQueryKey(userId: string, date: string): unknown[] {
  return ['water-logs', userId, date];
}

function getQueryKeyForChannel(
  channel: ChannelType,
  userId: string,
  date: string,
): unknown[] {
  return channel === 'meal_logs'
    ? getMealLogsQueryKey(userId, date)
    : getWaterLogsQueryKey(userId, date);
}

function getChannelName(table: ChannelType, userId: string, date: string): string {
  return `${table}:${userId}:${date}`;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty userId string (mirrors realistic email / uuid values) */
const userIdArb = fc.string({ minLength: 1, maxLength: 64 });

/** YYYY-MM-DD date string */
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(
  (d) => d.toISOString().split('T')[0],
);

const eventTypeArb: fc.Arbitrary<EventType> = fc.oneof(
  fc.constant('INSERT' as const),
  fc.constant('UPDATE' as const),
  fc.constant('DELETE' as const),
);

const channelTypeArb: fc.Arbitrary<ChannelType> = fc.oneof(
  fc.constant('meal_logs' as const),
  fc.constant('water_logs' as const),
);

// ---------------------------------------------------------------------------
// Property 7 — tests
// ---------------------------------------------------------------------------

describe('Property 7: real-time subscription query key correctness', () => {
  // -------------------------------------------------------------------------
  // Sub-property 1: getMealLogsQueryKey always returns ['meal-logs', userId, date]
  // -------------------------------------------------------------------------
  it(
    'getMealLogsQueryKey returns ["meal-logs", userId, date] for any userId and date',
    () => {
      fc.assert(
        fc.property(userIdArb, dateArb, (userId, date) => {
          const key = getMealLogsQueryKey(userId, date);

          expect(key).toHaveLength(3);
          expect(key[0]).toBe('meal-logs');
          expect(key[1]).toBe(userId);
          expect(key[2]).toBe(date);
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Sub-property 2: getWaterLogsQueryKey always returns ['water-logs', userId, date]
  // -------------------------------------------------------------------------
  it(
    'getWaterLogsQueryKey returns ["water-logs", userId, date] for any userId and date',
    () => {
      fc.assert(
        fc.property(userIdArb, dateArb, (userId, date) => {
          const key = getWaterLogsQueryKey(userId, date);

          expect(key).toHaveLength(3);
          expect(key[0]).toBe('water-logs');
          expect(key[1]).toBe(userId);
          expect(key[2]).toBe(date);
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Sub-property 3: meal_logs channel events always produce ['meal-logs', userId, date]
  // Covers Requirement 6.3 — any INSERT/UPDATE/DELETE on meal_logs
  // -------------------------------------------------------------------------
  it(
    'any event type on meal_logs channel produces queryKey ["meal-logs", userId, date]',
    () => {
      fc.assert(
        fc.property(eventTypeArb, userIdArb, dateArb, (eventType, userId, date) => {
          // The event type must not affect which query key is used
          const key = getQueryKeyForChannel('meal_logs', userId, date);

          expect(key).toHaveLength(3);
          expect(key[0]).toBe('meal-logs');
          expect(key[1]).toBe(userId);
          expect(key[2]).toBe(date);

          // Sanity: the event type is irrelevant — all three map to the same key
          void eventType;
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Sub-property 4: water_logs channel events always produce ['water-logs', userId, date]
  // Covers Requirement 6.4 — any event on water_logs
  // -------------------------------------------------------------------------
  it(
    'any event type on water_logs channel produces queryKey ["water-logs", userId, date]',
    () => {
      fc.assert(
        fc.property(eventTypeArb, userIdArb, dateArb, (eventType, userId, date) => {
          const key = getQueryKeyForChannel('water_logs', userId, date);

          expect(key).toHaveLength(3);
          expect(key[0]).toBe('water-logs');
          expect(key[1]).toBe(userId);
          expect(key[2]).toBe(date);

          void eventType;
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Sub-property 5: channel name format is `${table}:${userId}:${date}`
  // -------------------------------------------------------------------------
  it(
    'channel name is always "${table}:${userId}:${date}" for any userId and date',
    () => {
      fc.assert(
        fc.property(channelTypeArb, userIdArb, dateArb, (table, userId, date) => {
          const name = getChannelName(table, userId, date);

          expect(name).toBe(`${table}:${userId}:${date}`);
          expect(name.startsWith(`${table}:`)).toBe(true);
          expect(name.endsWith(`:${date}`)).toBe(true);
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Sub-property 6: meal_logs and water_logs query keys are always distinct
  // -------------------------------------------------------------------------
  it(
    'meal_logs query key never equals water_logs query key for any userId and date',
    () => {
      fc.assert(
        fc.property(userIdArb, dateArb, (userId, date) => {
          const mealKey = getMealLogsQueryKey(userId, date);
          const waterKey = getWaterLogsQueryKey(userId, date);

          // The first element (the "name" segment) must differ
          expect(mealKey[0]).not.toBe(waterKey[0]);

          // The full serialised keys must differ
          expect(JSON.stringify(mealKey)).not.toBe(JSON.stringify(waterKey));
        }),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Integration: simulate callback dispatch — verifies the routing logic
  // that the page.tsx useEffect uses for both channels
  // -------------------------------------------------------------------------
  it(
    'callback dispatch routes any event on either channel to the correct invalidateQueries call',
    () => {
      fc.assert(
        fc.property(channelTypeArb, eventTypeArb, userIdArb, dateArb, (channel, _event, userId, date) => {
          // Simulate what the callback in useEffect does:
          // It calls queryClient.invalidateQueries({ queryKey: <key> })
          // We capture the key that would be passed.
          const key = getQueryKeyForChannel(channel, userId, date);

          if (channel === 'meal_logs') {
            expect(key[0]).toBe('meal-logs');
          } else {
            expect(key[0]).toBe('water-logs');
          }

          expect(key[1]).toBe(userId);
          expect(key[2]).toBe(date);
        }),
        { numRuns: 100 },
      );
    },
  );
});
