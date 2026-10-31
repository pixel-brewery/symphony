// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISnapshotRouteStore } from '../view-presenters/routeHydration/ISnapshotRouteStore';

// #endregion

/** Binds the three actual lifecycle dependencies of Delivery route hydration. @public */
export const DELIVERY_ROUTE_HYDRATION = new InjectionToken<ISnapshotRouteStore>(
  'DELIVERY_ROUTE_HYDRATION',
);
