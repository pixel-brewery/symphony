// #region Imports

import { InjectionToken } from '@angular/core';
import type { IBoardRouteStore } from '../board/view-presenters/routeHydration/IBoardRouteStore';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_BOARD_ROUTE = new InjectionToken<IBoardRouteStore>('WORK_BOARD_ROUTE');
