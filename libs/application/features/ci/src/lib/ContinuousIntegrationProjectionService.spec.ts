// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { RemoteProviderRateLimitError } from '@symphony/application-core';
import type { ICiRun, ICiWorkflow, IContinuousIntegrationProjection } from '@symphony/domain-ci';
import type { IContinuousIntegrationPort } from './ports/IContinuousIntegrationPort';
import type { IContinuousIntegrationProjectionRepository } from './ports/IContinuousIntegrationProjectionRepository';
import { ContinuousIntegrationProjectionService } from './ContinuousIntegrationProjectionService';

// #endregion

describe('ContinuousIntegrationProjectionService continuous-integration polling', () => {
  const workflow: ICiWorkflow = {
    id: 'ci-1:101',
    workspaceId: 'workspace-1',
    ciBindingId: 'ci-1',
    repositoryBindingId: 'repository-1',
    name: 'PR Quality',
    path: '.github/workflows/ci.yml',
    state: 'active',
    defaultBranch: 'main',
    supportsManualDispatch: true,
  };
  const cachedRun: ICiRun = {
    id: 'ci-1:201',
    workspaceId: 'workspace-1',
    ciBindingId: 'ci-1',
    repositoryBindingId: 'repository-1',
    workflowId: workflow.id,
    name: 'PR Quality',
    status: 'succeeded',
  };
  const currentRun: ICiRun = { ...cachedRun, id: 'ci-1:202', status: 'in-progress' };
  const cached: IContinuousIntegrationProjection = {
    version: 1,
    workspaceIds: ['workspace-1'],
    ciWorkflows: [workflow],
    ciRuns: [cachedRun],
    refreshedAt: '2026-08-19T09:00:00.000Z',
  };

  function createContinuousIntegrationService(
    ci: IContinuousIntegrationPort,
    scope = () => ({
      workspaceIds: ['workspace-1'],
      continuousIntegration: 'workspace-1',
    }),
  ): {
    readonly service: ContinuousIntegrationProjectionService;
    readonly repository: IContinuousIntegrationProjectionRepository;
    readonly record: ReturnType<typeof vi.fn>;
  } {
    const projections = new Map([['workspace-1', cached]]);
    const repository: IContinuousIntegrationProjectionRepository = {
      loadContinuousIntegration: vi.fn((key) => projections.get(key)),
      saveContinuousIntegration: vi.fn((key, projection) => {
        projections.set(key, projection);
      }),
    };
    const record = vi.fn();
    return {
      repository,
      record,
      service: new ContinuousIntegrationProjectionService({
        ci,
        repository,
        runHistory: { record },
        clock: { now: () => '2026-08-19T10:00:00.000Z' },
        scope,
      }),
    };
  }

  it('refreshes only runs while preserving the saved workflow catalog', async () => {
    // arrange
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn(async () => [currentRun]),
    };
    const { repository, service } = createContinuousIntegrationService(ci);

    // act
    const result = await service.refresh();

    // assert
    expect(ci.listWorkflows).not.toHaveBeenCalled();
    expect(ci.listRuns).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ciWorkflows: [workflow],
      ciRuns: [currentRun],
      status: {
        state: 'current',
        lastSuccessfulRefreshAt: '2026-08-19T10:00:00.000Z',
      },
    });
    expect(repository.saveContinuousIntegration).toHaveBeenCalledWith(
      'workspace-1',
      expect.objectContaining({ ciWorkflows: [workflow], ciRuns: [currentRun] }),
    );
  });

  it('records the runs of every successful read in the durable run history', async () => {
    // arrange
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn(async () => [cachedRun, currentRun]),
    };
    const { service, record } = createContinuousIntegrationService(ci);

    // act
    await service.refresh();
    await service.refresh(true);

    // assert
    expect(record.mock.calls).toEqual([[[cachedRun, currentRun]], [[cachedRun, currentRun]]]);
  });

  it('refreshes the workflow catalog only when explicitly requested', async () => {
    // arrange
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn(async () => [currentRun]),
    };
    const { service } = createContinuousIntegrationService(ci);

    // act
    const result = await service.refresh(true);

    // assert
    expect(ci.listWorkflows).toHaveBeenCalledOnce();
    expect(ci.listRuns).toHaveBeenCalledOnce();
    expect(result.ciWorkflows).toEqual([workflow]);
    expect(result.ciRuns).toEqual([currentRun]);
  });

  it('loads the cold workflow catalog after an active run poll and coalesces inclusive callers', async () => {
    // arrange
    let completePoll: (runs: readonly ICiRun[]) => void = () => undefined;
    const pendingPoll = new Promise<readonly ICiRun[]>((resolve) => {
      completePoll = resolve;
    });
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn().mockReturnValueOnce(pendingPoll).mockResolvedValue([currentRun]),
    };
    const { service, repository } = createContinuousIntegrationService(ci);
    vi.mocked(repository.loadContinuousIntegration).mockReturnValue(undefined);

    // act
    const poll = service.refresh();
    const firstInclusive = service.refresh(true);
    const secondInclusive = service.refresh(true);
    completePoll([currentRun]);
    const [polled, first, second] = await Promise.all([poll, firstInclusive, secondInclusive]);

    // assert
    expect(polled.ciWorkflows).toEqual([]);
    expect(first.ciWorkflows).toEqual([workflow]);
    expect(second.ciWorkflows).toEqual([workflow]);
    expect(ci.listWorkflows).toHaveBeenCalledOnce();
    expect(ci.listRuns).toHaveBeenCalledTimes(2);
    expect(repository.saveContinuousIntegration).toHaveBeenLastCalledWith(
      'workspace-1',
      expect.objectContaining({ ciWorkflows: [workflow], ciRuns: [currentRun] }),
    );
  });

  it('preserves the latest saved runs and workflow catalog when the queued catalogue read fails', async () => {
    // arrange
    let completePoll: (runs: readonly ICiRun[]) => void = () => undefined;
    const pendingPoll = new Promise<readonly ICiRun[]>((resolve) => {
      completePoll = resolve;
    });
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => {
        throw new Error('The workflow catalog is unavailable.');
      }),
      listRuns: vi.fn().mockReturnValueOnce(pendingPoll).mockResolvedValue([currentRun]),
    };
    const { service } = createContinuousIntegrationService(ci);

    // act
    const poll = service.refresh();
    const inclusive = service.refresh(true);
    completePoll([currentRun]);
    await poll;
    const result = await inclusive;

    // assert
    expect(ci.listWorkflows).toHaveBeenCalledOnce();
    expect(result.ciWorkflows).toEqual([workflow]);
    expect(result.ciRuns).toEqual([currentRun]);
    expect(result.status.state).toBe('stale');
  });

  it('keeps a queued catalogue read in the newly selected scope without saving the old read there', async () => {
    // arrange
    let selectedScope = 'workspace-1';
    let completePoll: (runs: readonly ICiRun[]) => void = () => undefined;
    const pendingPoll = new Promise<readonly ICiRun[]>((resolve) => {
      completePoll = resolve;
    });
    const nextWorkflow: ICiWorkflow = { ...workflow, workspaceId: 'workspace-2' };
    const nextRun: ICiRun = { ...currentRun, workspaceId: 'workspace-2' };
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [nextWorkflow]),
      listRuns: vi.fn().mockReturnValueOnce(pendingPoll).mockResolvedValue([nextRun]),
    };
    const { service, repository } = createContinuousIntegrationService(ci, () => ({
      workspaceIds: [selectedScope],
      continuousIntegration: selectedScope,
    }));

    // act
    const poll = service.refresh();
    selectedScope = 'workspace-2';
    const inclusive = service.refresh(true);
    completePoll([currentRun]);
    await poll;
    const result = await inclusive;

    // assert
    expect(result.ciWorkflows).toEqual([nextWorkflow]);
    expect(result.ciRuns).toEqual([nextRun]);
    expect(repository.saveContinuousIntegration).toHaveBeenCalledExactlyOnceWith(
      'workspace-2',
      expect.objectContaining({ workspaceIds: ['workspace-2'], ciWorkflows: [nextWorkflow] }),
    );
  });

  it('projects the provider recovery time when a run poll reaches its request limit', async () => {
    // arrange
    const retryAt = '2026-08-19T11:00:00.000Z';
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn(async () => {
        throw new RemoteProviderRateLimitError('Provider-specific detail.', retryAt);
      }),
    };
    const { service, record } = createContinuousIntegrationService(ci);

    // act
    const result = await service.refresh();

    // assert
    expect(result.ciRuns).toEqual([cachedRun]);
    expect(record).not.toHaveBeenCalled();
    expect(result.status).toEqual({
      state: 'stale',
      reason: 'rate-limited',
      retryAt,
      lastSuccessfulRefreshAt: cached.refreshedAt,
    });
    expect(JSON.stringify(result.status)).not.toContain('Provider-specific');
  });
});
