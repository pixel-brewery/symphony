// #region Imports

import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IWorkItemComment } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { resolveWorkItemActivity } from './resolveWorkItemActivity';

// #endregion

describe('resolveWorkItemActivity', () => {
  it('merges the opening, run events and comments newest first', () => {
    // arrange
    const events: IExecutionEvent[] = [
      {
        id: 'event-1',
        executionId: 'execution-1',
        kind: 'execution.started',
        message: 'Analyzer started',
        occurredAt: '2026-10-31T16:48:00.000Z',
        sequence: 1,
      },
    ];
    const comments: IWorkItemComment[] = [
      { id: 'comment-1', body: 'First', createdAt: '2026-10-31T16:38:00.000Z' },
      { id: 'comment-2', body: 'Latest', createdAt: '2026-10-31T16:52:00.000Z' },
    ];

    // act
    const actual = resolveWorkItemActivity('2026-10-17T09:00:00.000Z', events, comments);

    // assert
    expect(actual.map((entry) => entry.id)).toEqual([
      'comment:comment-2',
      'event:event-1',
      'comment:comment-1',
      'opened',
    ]);
  });

  it('leaves the opening out when the provider does not report it', () => {
    // act
    const actual = resolveWorkItemActivity(undefined, [], []);

    // assert
    expect(actual).toEqual([]);
  });
});
