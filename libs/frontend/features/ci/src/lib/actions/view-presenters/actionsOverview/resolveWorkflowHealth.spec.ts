// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { resolveWorkflowHealth } from './resolveWorkflowHealth';

// #endregion

function row(status: ICiRun['status'], finishedAt?: string): IActionRunRow {
  return {
    id: `${status}:${finishedAt}`,
    workflowName: 'Deploy Dev',
    status,
    runner: 'github',
    startedAt: '2026-10-30T08:00:00.000Z',
    ...(finishedAt ? { finishedAt } : {}),
    runningLocally: false,
  };
}

describe('resolveWorkflowHealth', () => {
  it('ranks a latest failure above a run in progress', () => {
    // act
    const health = resolveWorkflowHealth([
      row('succeeded', '2026-10-30T08:05:00.000Z'),
      row('failed', '2026-10-30T09:05:00.000Z'),
      row('queued'),
    ]);

    // assert
    expect(health).toBe('failing');
  });

  it('reports running, passing and idle workflows', () => {
    // act
    const states = [
      resolveWorkflowHealth([
        row('failed', '2026-10-30T08:05:00.000Z'),
        row('succeeded', '2026-10-30T09:05:00.000Z'),
        row('in-progress'),
      ]),
      resolveWorkflowHealth([row('succeeded', '2026-10-30T09:05:00.000Z')]),
      resolveWorkflowHealth([row('cancelled', '2026-10-30T09:05:00.000Z')]),
      resolveWorkflowHealth([]),
    ];

    // assert
    expect(states).toEqual(['running', 'passing', 'idle', 'idle']);
  });
});
