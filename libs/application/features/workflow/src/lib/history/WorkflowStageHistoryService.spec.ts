// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IWorkflowStageChangeQuery } from './IWorkflowStageChangeQuery';
import { WorkflowStageHistoryService } from './WorkflowStageHistoryService';

// #endregion

function setup(now = '2026-10-31T12:00:00.000Z') {
  const listStageChanges = vi.fn((query: IWorkflowStageChangeQuery) => {
    void query;
    return { changes: [], truncated: false };
  });
  const service = new WorkflowStageHistoryService({
    repository: { listStageChanges },
    clock: { now: () => now },
  });
  return { service, listStageChanges };
}

describe('WorkflowStageHistoryService', () => {
  it('reads the scope from the requested instant with the bounded maximum', () => {
    // arrange
    const { service, listStageChanges } = setup();

    // act
    service.list({ workspaceIds: ['personal', 'personal', 'team'], since: '2026-10-17T12:00:00Z' });

    // assert
    expect(listStageChanges).toHaveBeenCalledWith({
      workspaceIds: ['personal', 'team'],
      since: '2026-10-17T12:00:00.000Z',
      limit: 10_000,
    });
  });

  it('never reads further back than 400 days or past the current instant', () => {
    // arrange
    const { service, listStageChanges } = setup();

    // act
    service.list({ workspaceIds: ['personal'], since: '2020-01-01T00:00:00.000Z' });
    service.list({ workspaceIds: ['personal'], since: '2030-01-01T00:00:00.000Z' });

    // assert
    expect(listStageChanges.mock.calls.map(([query]) => query.since)).toEqual([
      '2025-09-26T12:00:00.000Z',
      '2026-10-31T12:00:00.000Z',
    ]);
  });

  it('reads nothing for a scope without workspaces', () => {
    // arrange
    const { service, listStageChanges } = setup();

    // act
    const actual = service.list({ workspaceIds: [], since: '2026-10-01T00:00:00.000Z' });

    // assert
    expect(actual).toEqual({ changes: [], truncated: false });
    expect(listStageChanges).not.toHaveBeenCalled();
  });
});
