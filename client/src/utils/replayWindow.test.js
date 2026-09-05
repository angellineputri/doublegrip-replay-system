import { describe, it, expect } from 'vitest';
import { computeReplayWindow } from './replayWindow';

describe('computeReplayWindow', () => {
  const cases = [
    {
      label: 'simple case, no wrap',
      args: [40, 70, false],
      expected: {
        isWrapped: false,
        segment1: { start: 20, end: 40 },
        segment2: null,
      },
    },
    {
      label: 'not enough footage yet — clamps to 0, no wrap even though rawStart < 0',
      args: [3, 70, false],
      expected: {
        isWrapped: false,
        segment1: { start: 0, end: 3 },
        segment2: null,
      },
    },
    {
      // rawStart = 3 - 20 = -17; wrappedStart = 70 + (-17) = 53 → 17s from prev loop + 3s current = 20s total
      label: 'actual wrap after looping',
      args: [3, 70, true],
      expected: {
        isWrapped: true,
        segment1: { start: 53, end: 70 },
        segment2: { start: 0, end: 3 },
      },
    },
    {
      // rawStart === 0: the condition is rawStart < 0, so this must NOT wrap.
      label: 'right at the 20s boundary — rawStart === 0, should NOT wrap',
      args: [20, 70, true],
      expected: {
        isWrapped: false,
        segment1: { start: 0, end: 20 },
        segment2: null,
      },
    },
    {
      // rawStart === -1: one second past the boundary, must wrap.
      label: 'one second past boundary — rawStart === -1, should wrap',
      args: [19, 70, true],
      expected: {
        isWrapped: true,
        segment1: { start: 69, end: 70 },
        segment2: { start: 0, end: 19 },
      },
    },
  ];

  for (const { label, args, expected } of cases) {
    it(label, () => {
      expect(computeReplayWindow(...args)).toEqual(expected);
    });
  }
});
