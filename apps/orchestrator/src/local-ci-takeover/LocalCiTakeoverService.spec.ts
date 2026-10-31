// #region Imports

import type { IContinuousIntegrationPort } from '@symphony/application-ci';
import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import { describe, expect, it, vi } from 'vitest';
import { LocalCiTakeoverService } from './LocalCiTakeoverService';

// #endregion

const candidate: ICiRun = {
  id: 'ci-1:203',
  workspaceId: 'workspace-1',
  ciBindingId: 'ci-1',
  repositoryBindingId: 'repository-1',
  name: 'Deploy Dev',
  status: 'queued',
  runAttempt: 2,
  startedAt: '2026-08-17T10:00:00.000Z',
};

function execution(runAttempt = 2): ILocalCiExecution {
  return {
    id: `local-${runAttempt}`,
    workspaceId: candidate.workspaceId,
    repositoryBindingId: candidate.repositoryBindingId,
    ciRunId: candidate.id,
    runAttempt,
    state: 'succeeded',
    startedAt: '2026-08-17T10:00:01.000Z',
    finishedAt: '2026-08-17T10:10:00.000Z',
  };
}

describe('LocalCiTakeoverService', () => {
  it('starts one eligible run and does not claim its persisted attempt again', async () => {
    // arrange
    const executions: ILocalCiExecution[] = [];
    const startLocalRun = vi.fn(async (run: ICiRun) => {
      const result = execution(run.runAttempt);
      executions.push(result);
      return result;
    });
    const continuousIntegration: IContinuousIntegrationPort = {
      listRuns: async () => [],
      listManagedLocalRunCandidates: async () => [candidate],
    };
    const service = new LocalCiTakeoverService(
      continuousIntegration,
      () => false,
      () => executions,
      startLocalRun,
      vi.fn(),
    );

    // act
    await service.reconcile();
    await vi.waitFor(() => expect(startLocalRun).toHaveBeenCalledTimes(1));
    await service.reconcile();

    // assert
    expect(startLocalRun).toHaveBeenCalledTimes(1);
    expect(startLocalRun).toHaveBeenCalledWith(candidate);
  });

  it('does not search while another local run is active', async () => {
    // arrange
    const listManagedLocalRunCandidates = vi.fn(async () => [candidate]);
    const service = new LocalCiTakeoverService(
      { listRuns: async () => [], listManagedLocalRunCandidates },
      () => true,
      () => [],
      vi.fn(),
      vi.fn(),
    );

    // act
    await service.reconcile();

    // assert
    expect(listManagedLocalRunCandidates).not.toHaveBeenCalled();
  });

  it('allows a later GitHub attempt of an already handled run', async () => {
    // arrange
    const startLocalRun = vi.fn(async () => execution(2));
    const service = new LocalCiTakeoverService(
      { listRuns: async () => [], listManagedLocalRunCandidates: async () => [candidate] },
      () => false,
      () => [execution(1)],
      startLocalRun,
      vi.fn(),
    );

    // act
    await service.reconcile();

    // assert
    await vi.waitFor(() => expect(startLocalRun).toHaveBeenCalledOnce());
  });

  it('skips an already handled candidate and starts the next eligible run', async () => {
    // arrange
    const nextCandidate: ICiRun = {
      ...candidate,
      id: 'ci-1:204',
      startedAt: '2026-08-17T10:01:00.000Z',
    };
    const startLocalRun = vi.fn(async () => ({
      ...execution(),
      ciRunId: nextCandidate.id,
    }));
    const service = new LocalCiTakeoverService(
      {
        listRuns: async () => [],
        listManagedLocalRunCandidates: async () => [candidate, nextCandidate],
      },
      () => false,
      () => [execution()],
      startLocalRun,
      vi.fn(),
    );

    // act
    await service.reconcile();

    // assert
    await vi.waitFor(() => expect(startLocalRun).toHaveBeenCalledWith(nextCandidate));
  });

  it('reports a failed start and makes the next reconciliation available', async () => {
    // arrange
    const failure = new Error('Local runner failed to start.');
    const reportFailure = vi.fn();
    const startLocalRun = vi
      .fn<(run: ICiRun) => Promise<ILocalCiExecution>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(execution());
    const service = new LocalCiTakeoverService(
      { listRuns: async () => [], listManagedLocalRunCandidates: async () => [candidate] },
      () => false,
      () => [],
      startLocalRun,
      reportFailure,
    );

    // act
    await service.reconcile();
    await vi.waitFor(() => expect(reportFailure).toHaveBeenCalledWith(failure));
    await service.reconcile();

    // assert
    await vi.waitFor(() => expect(startLocalRun).toHaveBeenCalledTimes(2));
  });
});
