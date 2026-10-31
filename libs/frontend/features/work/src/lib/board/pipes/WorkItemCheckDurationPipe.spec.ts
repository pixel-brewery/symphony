// #region Imports

import { describe, expect, it } from 'vitest';
import { WorkItemCheckDurationPipe } from './WorkItemCheckDurationPipe';

// #endregion

describe('WorkItemCheckDurationPipe', () => {
  it('formats finished, running and unknown durations', () => {
    // arrange
    const pipe = new WorkItemCheckDurationPipe();
    const now = Date.parse('2026-10-31T17:00:00.000Z');

    // act
    const seconds = pipe.transform(
      {
        status: 'succeeded',
        startedAt: '2026-10-31T16:52:00.000Z',
        finishedAt: '2026-10-31T16:52:42.000Z',
      },
      now,
    );
    const running = pipe.transform(
      { status: 'in-progress', startedAt: '2026-10-31T16:58:00.000Z' },
      now,
    );
    const long = pipe.transform(
      {
        status: 'failed',
        startedAt: '2026-10-31T15:00:00.000Z',
        finishedAt: '2026-10-31T16:12:00.000Z',
      },
      now,
    );
    const unknown = pipe.transform({ status: 'queued' }, now);

    // assert
    expect([seconds, running, long, unknown]).toEqual(['42 s', '2 min', '1 h 12 min', '—']);
  });
});
