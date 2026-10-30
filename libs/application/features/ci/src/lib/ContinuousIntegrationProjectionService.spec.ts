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

  function createContinuousIntegrationService(ci: IContinuousIntegrationPort): {
    readonly service: ContinuousIntegrationProjectionService;
    readonly repository: IContinuousIntegrationProjectionRepository;
  } {
    const repository: IContinuousIntegrationProjectionRepository = {
      loadContinuousIntegration: vi.fn(() => cached),
      saveContinuousIntegration: vi.fn(),
    };
    return {
      repository,
      service: new ContinuousIntegrationProjectionService({
        ci,
        repository,
        clock: { now: () => '2026-08-19T10:00:00.000Z' },
        scope: () => ({
          workspaceIds: ['workspace-1'],
          continuousIntegration: 'workspace-1',
        }),
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

  it('projects the provider recovery time when a run poll reaches its request limit', async () => {
    // arrange
    const retryAt = '2026-08-19T11:00:00.000Z';
    const ci: IContinuousIntegrationPort = {
      listWorkflows: vi.fn(async () => [workflow]),
      listRuns: vi.fn(async () => {
        throw new RemoteProviderRateLimitError('Provider-specific detail.', retryAt);
      }),
    };
    const { service } = createContinuousIntegrationService(ci);

    // act
    const result = await service.refresh();

    // assert
    expect(result.ciRuns).toEqual([cachedRun]);
    expect(result.status).toEqual({
      state: 'stale',
      reason: 'rate-limited',
      retryAt,
      lastSuccessfulRefreshAt: cached.refreshedAt,
    });
    expect(JSON.stringify(result.status)).not.toContain('Provider-specific');
  });
});
