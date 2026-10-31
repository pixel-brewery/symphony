// #region Imports

import { describe, expect, it } from 'vitest';
import { ActionRunDurationPipe } from './ActionRunDurationPipe';

// #endregion

describe('ActionRunDurationPipe', () => {
  it('formats seconds, minutes and hours and leaves unfinished spans empty', () => {
    // arrange
    const pipe = new ActionRunDurationPipe();
    const start = '2026-10-30T08:00:00.000Z';

    // act
    const labels = [
      pipe.transform(start, '2026-10-30T08:00:42.000Z'),
      pipe.transform(start, '2026-10-30T08:05:02.000Z'),
      pipe.transform(start, '2026-10-30T09:05:00.000Z'),
      pipe.transform(start, undefined),
    ];

    // assert
    expect(labels).toEqual(['42s', '5m 02s', '1h 05m', '']);
  });
});
