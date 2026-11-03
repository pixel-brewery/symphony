// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { WorkTrackingProjectionService } from '@symphony/application-work';
import type { IWorkTrackingProjectionPort } from '@symphony/application-work';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IDeliverySnapshot } from '@symphony/domain-delivery';
import type { IProvideDeliveryOrchestratorFeatureDependencies } from './IProvideDeliveryOrchestratorFeatureDependencies';
import { provideDeliveryOrchestratorFeature } from './provideDeliveryOrchestratorFeature';

// #endregion

describe('provideDeliveryOrchestratorFeature', () => {
  it('refreshes delivery evidence while unrelated board and aggregate cloud reads remain pending', async () => {
    // arrange
    const item: IWorkItem = {
      id: 'item',
      workspaceId: 'personal',
      externalId: '#1',
      title: 'Deliver change',
      body: '',
      provider: 'github-projects',
      repository: 'owner/repo',
      labels: [],
      assignees: [],
    };
    const execution: IExecutionRecord = {
      id: 'execution',
      workItemId: item.id,
      state: 'succeeded',
      workflowId: 'workflow',
      startedAt: '2026-10-31T10:00:00Z',
    };
    let finishBoard!: (items: readonly IWorkItem[]) => void;
    const tracker: IWorkTrackingProjectionPort = {
      listWorkItems: vi.fn(
        () => new Promise<readonly IWorkItem[]>((resolve) => (finishBoard = resolve)),
      ),
      listProjectFields: async () => [],
      listBoardColumns: async () => [],
      loadWorkItemDetails: async (workItem) => workItem,
    };
    const workTrackingProjection = new WorkTrackingProjectionService({
      tracker,
      repository: {
        loadWorkTracking: () => ({
          version: 1,
          workspaceIds: ['personal'],
          workItems: [item],
          projectFields: [],
          boardColumns: [],
          refreshedAt: '2026-10-01T10:00:00Z',
        }),
        saveWorkTracking: () => undefined,
        loadWorkItemDetail: () => undefined,
        saveWorkItemDetail: () => undefined,
      },
      clock: { now: () => '2026-10-31T10:00:00Z' },
      scope: () => ({ workspaceIds: ['personal'], workTracking: 'personal' }),
    });
    const boardRefresh = workTrackingProjection.loadProjection(true);
    const evidence: IDeliverySnapshot = {
      targets: [],
      evidence: [],
      refreshedAt: '2026-10-31T10:00:00Z',
      errors: [],
    };
    const readDelivery = vi.fn(async () => evidence);
    const unavailable = () => {
      throw new Error('Unused capability');
    };
    const dependencies: IProvideDeliveryOrchestratorFeatureDependencies = {
      settingsState: { current: createDefaultApplicationSettings() },
      service: {
        publishPullRequest: unavailable,
        executionState: () => ({
          executions: [execution],
          executionQueue: [],
          events: [],
          goals: [],
          deliveryGroups: [],
          deliveryGroupProposals: [],
        }),
      },
      github: {
        readDelivery,
        listBranches: unavailable,
        compareBranches: unavailable,
        createPullRequest: unavailable,
        updateListedPullRequestBranch: unavailable,
      },
      simulatedPullRequestDelivery: undefined,
      deliveryService: {
        preview: unavailable,
        start: unavailable,
        list: () => [],
        reconcile: unavailable,
      },
      workTrackingProjection,
      simulatedPullRequestBranches: unavailable,
      simulatedPullRequestComparison: unavailable,
      simulatedPullRequestCreation: unavailable,
    };
    // A full snapshot could itself await CI or health checks indefinitely. Delivery must not use it.
    const snapshot = vi.fn(() => new Promise<never>(() => undefined));
    const feature = provideDeliveryOrchestratorFeature({
      ...dependencies,
      ...{ snapshotService: { snapshot } },
    });
    const handler = feature.handlers.find((candidate) => candidate.method === 'delivery.refresh');
    if (!handler) throw new Error('Delivery refresh handler missing');

    // act
    const actual = await handler.execute({}, () => undefined);
    finishBoard([item]);
    await boardRefresh;

    // assert
    expect(actual).toBe(evidence);
    expect(readDelivery).toHaveBeenCalledExactlyOnceWith([item], [execution]);
    expect(snapshot).not.toHaveBeenCalled();
    expect(tracker.listWorkItems).toHaveBeenCalledOnce();
  });
});
