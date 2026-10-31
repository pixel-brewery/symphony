// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { projectActionsOverview } from './projectActionsOverview';

// #endregion

function row(id: string, status: ICiRun['status'], startedAt: string): IActionRunRow {
  return { id, workflowName: id, status, runner: 'github', startedAt, runningLocally: false };
}

const rows = [
  row('queued', 'queued', '2026-10-30T12:00:00.000Z'),
  row('running', 'in-progress', '2026-10-30T11:00:00.000Z'),
  row('failed', 'failed', '2026-10-30T10:00:00.000Z'),
  row('passed', 'succeeded', '2026-10-30T09:00:00.000Z'),
  row('cancelled', 'cancelled', '2026-10-30T08:00:00.000Z'),
];

describe('projectActionsOverview', () => {
  it('puts running runs before queued ones and pages the newest finished runs', () => {
    // act
    const overview = projectActionsOverview(rows, { query: '' }, 'started-descending', 2);

    // assert
    expect(overview.running.map((entry) => entry.id)).toEqual(['running', 'queued']);
    expect(overview.history.map((entry) => entry.id)).toEqual(['failed', 'passed']);
    expect(overview.hasOlderRuns).toBe(true);
  });

  it('applies the filter and the oldest-first order', () => {
    // act
    const overview = projectActionsOverview(
      rows,
      { status: 'cancelled', query: '' },
      'started-ascending',
      10,
    );

    // assert
    expect(overview.running).toEqual([]);
    expect(overview.history.map((entry) => entry.id)).toEqual(['cancelled']);
    expect(overview.hasOlderRuns).toBe(false);
  });
});
