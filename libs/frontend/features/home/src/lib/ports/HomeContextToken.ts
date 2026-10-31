// #region Imports

import { computed, inject, InjectionToken } from '@angular/core';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { DELIVERY_LAUNCH_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { WORKFLOW_OPERATIONS } from '@symphony/frontend-core/workflow';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import type { IHomeContext } from './IHomeContext';

// #endregion

/** Binds Overview's and Inbox's projections without constructing other product features. @public */
export const HOME_CONTEXT = new InjectionToken<IHomeContext>('HOME_CONTEXT', {
  providedIn: 'root',
  factory: () => {
    const projection = inject(ApplicationProjection);
    const bootstrap = inject(ApplicationBootstrap);
    const synchronizer = inject(OrchestrationSynchronizer);
    const platform = inject(PLATFORM_OPERATIONS, { optional: true });
    const ci = inject(CI_OPERATIONS, { optional: true });
    const client = inject(ORCHESTRATION_CLIENT);
    return {
      hasSnapshot: computed(() => Boolean(projection.snapshot())),
      externalServiceIncident: computed(() => platform?.externalServiceIncidents()[0]),
      snapshot: projection.snapshot,
      settings: projection.settings,
      activeWorkspace: projection.activeWorkspace,
      selectedWorkspaceIds: projection.selectedWorkspaceIds,
      scopedRepositories: projection.scopedRepositories,
      scopedWorkItems: projection.scopedWorkItems,
      activeBoardId: computed(() => projection.activeBoard()?.id),
      syncBusy: ci?.continuousIntegrationRunsBusy ?? computed(() => false),
      execution: inject(EXECUTION_OPERATIONS, { optional: true }),
      workflow: inject(WORKFLOW_OPERATIONS, { optional: true }),
      ci,
      delivery: inject(DELIVERY_LAUNCH_OPERATIONS, { optional: true }),
      repositoryRuntime: inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true }),
      initialize: () => bootstrap.initialize(),
      // The snapshot refresh replaces the cached runs, so the fresher CI refresh runs after it.
      sync: async () => {
        await synchronizer.refresh();
        await ci?.refreshContinuousIntegrationRuns();
      },
      // Both reads cover the active view scope the orchestrator holds, like the snapshot.
      listStageChanges: (since) => client.request('workflow.stage-changes.list', { since }),
      listRunHistory: (since) => client.request('ci.runs.history.list', { since }),
    };
  },
});
