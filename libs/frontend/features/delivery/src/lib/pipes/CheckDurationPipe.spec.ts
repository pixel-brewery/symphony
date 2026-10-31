// #region Imports

import { describe, expect, it } from 'vitest';
import { CheckDurationPipe } from './CheckDurationPipe';

// #endregion

describe('CheckDurationPipe', () => {
  it.each([
    ['2026-10-30T09:00:00.000Z', '2026-10-30T09:00:42.000Z', '42 s'],
    ['2026-10-30T09:00:00.000Z', '2026-10-30T09:03:10.000Z', '3 min'],
    ['2026-10-30T09:00:00.000Z', '2026-10-30T10:05:00.000Z', '1 h 5 min'],
    ['2026-10-30T09:00:00.000Z', '2026-10-30T11:00:00.000Z', '2 h'],
    ['2026-10-30T09:00:00.000Z', undefined, ''],
    [undefined, '2026-10-30T09:00:00.000Z', ''],
  ])('formats %s to %s as %j', (startedAt, finishedAt, expected) => {
    // arrange
    const pipe = new CheckDurationPipe();

    // act
    const duration = pipe.transform(startedAt, finishedAt);

    // assert
    expect(duration).toBe(expected);
  });
});
