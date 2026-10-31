// #region Imports

import { describe, expect, it } from 'vitest';
import { ActionRunStartedPipe } from './ActionRunStartedPipe';

// #endregion

describe('ActionRunStartedPipe', () => {
  it('says today with the time, yesterday, the date, and the year for an earlier year', () => {
    // arrange
    const pipe = new ActionRunStartedPipe();
    const now = new Date(2026, 9, 30, 18, 0).getTime();

    // act
    const labels = [
      pipe.transform(new Date(2026, 9, 30, 16, 52).toISOString(), now),
      pipe.transform(new Date(2026, 9, 29, 9, 0).toISOString(), now),
      pipe.transform(new Date(2026, 9, 24, 9, 0).toISOString(), now),
      pipe.transform(new Date(2025, 11, 24, 9, 0).toISOString(), now),
      pipe.transform(undefined, now),
    ];

    // assert
    expect(labels).toEqual(['Today, 16:52', 'Yesterday', 'Oct 24', 'Dec 24, 2025', '']);
  });
});
