// #region Imports

import { inject } from '@angular/core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import type { ISnapshotRouteStore } from '../view-presenters/routeHydration/ISnapshotRouteStore';

// #endregion

/** Connects Delivery's unchanged route hydration order to the current single owners. @internal */
export function createDeliveryRouteHydration(): ISnapshotRouteStore {
  const bootstrap = inject(ApplicationBootstrap);
  const synchronization = inject(OrchestrationSynchronizer);
  const ci = inject(DELIVERY_CI_OPERATIONS);
  return {
    initialize: () => bootstrap.initialize(),
    refresh: () => synchronization.refresh(),
    refreshContinuousIntegrationRuns: () =>
      ci?.refreshContinuousIntegrationRuns() ?? Promise.resolve(),
  };
}
