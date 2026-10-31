// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it, vi } from 'vitest';
import type { ICiRunHistoryQuery } from './ICiRunHistoryQuery';
import { CiRunHistoryService } from './CiRunHistoryService';

// #endregion

const NOW = '2026-10-31T12:00:00.000Z';

function run(id: string, status: ICiRun['status'], overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id,
    workspaceId: 'personal',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name: 'PR Quality',
    status,
    startedAt: '2026-10-30T10:00:00.000Z',
    ...overrides,
  };
}

function setup(
  recordRuns: (runs: readonly ICiRun[], retainSince: string) => void = () => undefined,
) {
  const listRunHistory = vi.fn((query: ICiRunHistoryQuery) => {
    void query;
    return { runs: [], truncated: false };
  });
  const reportRecordFailure = vi.fn();
  const recorded = vi.fn(recordRuns);
  const service = new CiRunHistoryService({
    repository: { recordRuns: recorded, listRunHistory },
    clock: { now: () => NOW },
    reportRecordFailure,
  });
  return { service, recorded, listRunHistory, reportRecordFailure };
}

describe('CiRunHistoryService', () => {
  it('records only finished runs with a start and keeps 200 days', () => {
    // arrange
    const { service, recorded } = setup();
    const succeeded = run('1', 'succeeded');
    const failed = run('2', 'failed', { startedAt: undefined, finishedAt: NOW });
    const cancelled = run('3', 'cancelled');

    // act
    service.record([
      succeeded,
      failed,
      cancelled,
      run('4', 'in-progress'),
      run('5', 'queued'),
      run('6', 'succeeded', { startedAt: undefined }),
    ]);

    // assert
    expect(recorded).toHaveBeenCalledWith(
      [succeeded, failed, cancelled],
      '2026-04-14T12:00:00.000Z',
    );
  });

  it('writes nothing when a read saw no finished run', () => {
    // arrange
    const { service, recorded } = setup();

    // act
    service.record([run('1', 'queued')]);

    // assert
    expect(recorded).not.toHaveBeenCalled();
  });

  it('reports a storage failure instead of failing the refresh that observed the runs', () => {
    // arrange
    const cause = new Error('disk full');
    const { service, reportRecordFailure } = setup(() => {
      throw cause;
    });

    // act
    const act = (): void => service.record([run('1', 'succeeded')]);

    // assert
    expect(act).not.toThrow();
    expect(reportRecordFailure).toHaveBeenCalledWith(cause);
  });

  it('reads the scope within the retention window with the bounded maximum', () => {
    // arrange
    const { service, listRunHistory } = setup();

    // act
    service.list({ workspaceIds: ['personal', 'personal'], since: '2026-10-01T12:00:00.000Z' });
    service.list({ workspaceIds: ['personal'], since: '2025-01-01T00:00:00.000Z' });
    const empty = service.list({ workspaceIds: [], since: '2026-10-01T12:00:00.000Z' });

    // assert
    expect(listRunHistory.mock.calls.map(([query]) => query)).toEqual([
      { workspaceIds: ['personal'], since: '2026-10-01T12:00:00.000Z', limit: 10_000 },
      { workspaceIds: ['personal'], since: '2026-04-14T12:00:00.000Z', limit: 10_000 },
    ]);
    expect(empty).toEqual({ runs: [], truncated: false });
  });
});
