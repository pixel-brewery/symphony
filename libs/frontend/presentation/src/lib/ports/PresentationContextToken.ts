// #region Imports

import { computed, inject, InjectionToken } from '@angular/core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { WORKSPACE_SCOPE } from '@symphony/frontend-core/workspace';
import type { IPresentationContext } from './IPresentationContext';

// #endregion

/** Composes only the shared shell and rail dependencies, including omitted features. @public */
export const PRESENTATION_CONTEXT = new InjectionToken<IPresentationContext>(
  'PRESENTATION_CONTEXT',
  {
    providedIn: 'root',
    factory: () => {
      const projection = inject(ApplicationProjection);
      const bootstrap = inject(ApplicationBootstrap);
      const execution = inject(EXECUTION_OPERATIONS, { optional: true });
      const ci = inject(CI_OPERATIONS, { optional: true });
      const workspace = inject(WORKSPACE_SCOPE, { optional: true });
      return {
        snapshot: projection.snapshot,
        settings: projection.settings,
        loading: projection.loading,
        activeWorkspace: projection.activeWorkspace,
        localCiRunningRunId: ci?.localCiRunningRunId ?? computed(() => undefined),
        localCiStartedAt: ci?.localCiStartedAt ?? computed(() => undefined),
        continuousIntegrationRunsBusy: ci?.continuousIntegrationRunsBusy ?? computed(() => false),
        executionAvailable: execution !== null,
        ciAvailable: ci !== null,
        workspaceScopeAvailable: workspace !== null,
        initialize: () => bootstrap.initialize(),
        removeQueueEntry: (entryId) =>
          execution?.removeQueueEntry(entryId) ?? Promise.resolve(false),
        refreshContinuousIntegrationRuns: () =>
          ci?.refreshContinuousIntegrationRuns() ?? Promise.resolve(),
        selectWorkspaceScope: (workspaceId) =>
          workspace?.selectWorkspaceScope(workspaceId) ?? Promise.resolve(),
      };
    },
  },
);
