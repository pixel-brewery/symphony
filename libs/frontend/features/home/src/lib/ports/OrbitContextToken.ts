// #region Imports

import { computed, inject, InjectionToken } from '@angular/core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { WORK_OPERATIONS, WORK_SELECTION, WORK_FILTERS } from '@symphony/frontend-core/work';
import { DELIVERY_LAUNCH_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import type { IOrbitContext } from './IOrbitContext';

// #endregion

/** Composes the Orbit's explicit readonly and optional cross-feature dependencies. @public */
export const ORBIT_CONTEXT = new InjectionToken<IOrbitContext>('ORBIT_CONTEXT', {
  providedIn: 'root',
  factory: () => {
    const projection = inject(ApplicationProjection);
    const bootstrap = inject(ApplicationBootstrap);
    const work = inject(WORK_OPERATIONS, { optional: true });
    const selection = inject(WORK_SELECTION, { optional: true });
    const ci = inject(CI_OPERATIONS, { optional: true });
    return {
      workFilters: inject(WORK_FILTERS, { optional: true }),
      delivery: inject(DELIVERY_LAUNCH_OPERATIONS, { optional: true }),
      snapshot: projection.snapshot,
      settings: projection.settings,
      selectedWorkspaceIds: projection.selectedWorkspaceIds,
      scopedRepositories: projection.scopedRepositories,
      scopedWorkItems: computed(() => (work ? projection.scopedWorkItems() : [])),
      activeBoardId: computed(() => projection.activeBoard()?.id),
      selectedWorkItem: work?.selectedWorkItem ?? computed(() => undefined),
      selectionExplicit: selection?.selectionExplicit ?? computed(() => false),
      initialize: () => bootstrap.initialize(),
      selectWorkItem: (workItemId) => selection?.select(workItemId),
      refreshContinuousIntegrationRuns: async () => {
        await ci?.refreshContinuousIntegrationRuns();
      },
    };
  },
});
