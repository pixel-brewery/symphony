// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { defaultWorkflow, type IWorkflowStageChange } from '@symphony/domain-workflow';
import { describe, expect, it } from 'vitest';
import { projectReporting } from './projectReporting';

// #endregion

const NOW = new Date(2026, 9, 30, 12, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, now = NOW): string {
  return new Date(now - days * DAY).toISOString();
}

function execution(id: string, startedDaysAgo: number, overrides: Partial<IExecutionRecord> = {}) {
  return {
    id,
    workItemId: 'item',
    workflowId: 'workflow',
    mode: 'ai',
    state: 'succeeded',
    startedAt: daysAgo(startedDaysAgo),
    ...overrides,
  } as IExecutionRecord;
}

function run(id: string, startedDaysAgo: number, overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repo',
    name: 'Deploy Dev',
    status: 'succeeded',
    startedAt: daysAgo(startedDaysAgo),
    ...overrides,
  };
}

/** A work item qualified `qualifiedDaysAgo` and moved to Done `doneDaysAgo`. */
function delivery(
  workItemId: string,
  doneDaysAgo: number,
  qualifiedDaysAgo?: number,
  now = NOW,
): IWorkflowStageChange[] {
  return [
    ...(qualifiedDaysAgo === undefined
      ? []
      : [{ workItemId, toStageId: 'qualified', changedAt: daysAgo(qualifiedDaysAgo, now) }]),
    { workItemId, toStageId: 'done', changedAt: daysAgo(doneDaysAgo, now) },
  ];
}

const BASE = { now: NOW, executions: [], ciRuns: [], workflow: defaultWorkflow } as const;

describe('projectReporting', () => {
  it('counts agent runs of the period and the period before, and the ones without intervention', () => {
    // arrange
    const executions = [
      execution('a', 1),
      execution('b', 2, { attempt: 2 }),
      execution('c', 3, { state: 'failed' }),
      execution('d', 4, { pause: { reason: 'operator', pausedAt: daysAgo(4) } }),
      execution('manual', 1, { mode: 'manual' }),
      execution('previous', 9),
      execution('ancient', 40),
    ];

    // act
    const summary = projectReporting({ ...BASE, period: '7-days', executions });

    // assert
    expect(summary.agentRuns).toEqual({ current: 4, previous: 1, withoutIntervention: 1 });
  });

  it('reports workflow success and runs from the recorded history and the current runs', () => {
    // arrange
    const runHistory = {
      recordedSince: daysAgo(60),
      runs: [
        run('1', 1),
        run('2', 2, { status: 'failed', name: 'Deploy Dev' }),
        run('3', 2, { status: 'failed', name: 'PR Quality' }),
        run('4', 3, { status: 'failed', name: 'Deploy Dev' }),
        run('5', 3, { status: 'cancelled' }),
        run('7', 8),
        run('8', 9, { status: 'failed' }),
      ],
    };
    const ciRuns = [run('6', 0.5, { status: 'in-progress' }), run('1', 1)];

    // act
    const summary = projectReporting({ ...BASE, period: '7-days', ciRuns, runHistory });

    // assert
    expect(summary.workflowSuccess).toEqual({
      current: 25,
      previous: 50,
      succeeded: 1,
      finished: 4,
    });
    expect(summary.workflowRuns).toEqual({
      total: 6,
      succeeded: 1,
      failed: 3,
      cancelled: 1,
      topFailure: { workflowName: 'Deploy Dev', failures: 2 },
    });
    expect(summary.runHistorySince).toBe(runHistory.recordedSince);
  });

  it('counts each attempt of a rerun and lets the fresher current run replace its record', () => {
    // arrange
    const runHistory = {
      recordedSince: daysAgo(30),
      runs: [run('9', 2, { status: 'failed', runAttempt: 1 }), run('10', 1, { status: 'failed' })],
    };
    const ciRuns = [
      run('9', 1.5, { status: 'succeeded', runAttempt: 2 }),
      run('10', 1, { status: 'cancelled' }),
    ];

    // act
    const summary = projectReporting({ ...BASE, period: '7-days', ciRuns, runHistory });

    // assert
    expect(summary.workflowRuns).toMatchObject({ total: 3, succeeded: 1, failed: 1, cancelled: 1 });
  });

  it('shows no workflow figures for a period that starts before the first recorded run', () => {
    // arrange
    const runHistory = { recordedSince: daysAgo(10), runs: [run('1', 1)] };

    // act
    const week = projectReporting({ ...BASE, period: '7-days', runHistory });
    const month = projectReporting({ ...BASE, period: '30-days', runHistory });
    const nothingRecorded = projectReporting({
      ...BASE,
      period: '7-days',
      runHistory: { runs: [] },
    });
    const notLoaded = projectReporting({ ...BASE, period: '7-days', ciRuns: [run('1', 1)] });

    // assert
    expect(week.workflowSuccess).toEqual({ current: 100, succeeded: 1, finished: 1 });
    expect(month.workflowSuccess).toBeUndefined();
    expect(month.workflowRuns).toBeUndefined();
    expect(month.runHistorySince).toBe(runHistory.recordedSince);
    expect(nothingRecorded.workflowRuns).toBeUndefined();
    expect(notLoaded.workflowRuns).toBeUndefined();
  });

  it('computes delivered and the median lead time and compares them with the period before', () => {
    // arrange
    const stageHistory = {
      recordedSince: daysAgo(100),
      changes: [
        ...delivery('a', 1, 5),
        ...delivery('b', 2, 6.6),
        ...delivery('c', 3, 9.5),
        ...delivery('d', 4, 7),
        ...delivery('previous', 10, 12),
        ...delivery('unqualified', 9),
      ],
    };

    // act
    const summary = projectReporting({ ...BASE, period: '7-days', stageHistory });

    // assert
    expect(summary.delivered).toEqual({ current: 4, previous: 2 });
    expect(summary.medianLeadTimeDays).toEqual({ current: 4.3, previous: 2 });
    expect(summary.deliveryHistorySince).toBe(stageHistory.recordedSince);
  });

  it('assigns a move to Done on a boundary to the period that ends there', () => {
    // arrange
    const stageHistory = {
      recordedSince: daysAgo(100),
      changes: [...delivery('boundary', 7), ...delivery('now', 0)],
    };

    // act
    const summary = projectReporting({ ...BASE, period: '7-days', stageHistory });

    // assert
    expect(summary.delivered).toEqual({ current: 1, previous: 1 });
  });

  it('shows no delivery figures for a period that starts before the earliest recorded change', () => {
    // arrange
    const changes = [...delivery('a', 1, 2)];

    // act
    const fresh = projectReporting({
      ...BASE,
      period: '7-days',
      stageHistory: { recordedSince: daysAgo(3), changes },
    });
    const partly = projectReporting({
      ...BASE,
      period: '7-days',
      stageHistory: { recordedSince: daysAgo(10), changes },
    });
    const none = projectReporting({ ...BASE, period: '7-days', stageHistory: { changes: [] } });

    // assert
    expect(fresh.delivered).toBeUndefined();
    expect(fresh.medianLeadTimeDays).toBeUndefined();
    expect(partly.delivered).toEqual({ current: 1 });
    expect(partly.medianLeadTimeDays).toEqual({ current: 1 });
    expect(none.delivered).toBeUndefined();
    expect(none.deliveredPerWeek).toBeUndefined();
    expect(none.deliveryHistorySince).toBeUndefined();
  });

  it('charts eight ISO weeks, leaving the weeks before the recorded history without a count', () => {
    // arrange
    const stageHistory = {
      recordedSince: new Date(2026, 8, 21).toISOString(),
      changes: [
        ...delivery('this-week', 1),
        ...delivery('also-this-week', 2),
        ...delivery('last-week', 6),
        ...delivery('before-history', 45),
      ],
    };

    // act
    const weeks = projectReporting({ ...BASE, period: '7-days', stageHistory }).deliveredPerWeek;

    // assert
    expect(weeks?.map((week) => [week.week, week.count, week.current])).toEqual([
      [37, undefined, false],
      [38, undefined, false],
      [39, 0, false],
      [40, 0, false],
      [41, 0, false],
      [42, 0, false],
      [43, 1, false],
      [44, 2, true],
    ]);
    expect(weeks?.[0]?.startsOn).toBe('2026-09-07');
  });

  it('numbers the weeks across a year with 53 ISO weeks', () => {
    // arrange
    const now = new Date(2027, 0, 2, 12, 0, 0).getTime();
    const stageHistory = { recordedSince: daysAgo(100, now), changes: delivery('a', 1, 2, now) };

    // act
    const weeks = projectReporting({
      ...BASE,
      now,
      period: '7-days',
      stageHistory,
    }).deliveredPerWeek;

    // assert
    expect(weeks?.map((week) => week.week)).toEqual([46, 47, 48, 49, 50, 51, 52, 53]);
    expect(weeks?.at(-1)).toMatchObject({ startsOn: '2026-12-28', count: 1, current: true });
  });

  it('has no stage-history figures while the history is not loaded', () => {
    // arrange
    const input = { ...BASE, period: 'quarter' } as const;

    // act
    const summary = projectReporting(input);

    // assert
    expect(summary.delivered).toBeUndefined();
    expect(summary.medianLeadTimeDays).toBeUndefined();
    expect(summary.deliveredPerWeek).toBeUndefined();
  });
});
