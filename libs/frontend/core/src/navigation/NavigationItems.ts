// #region Imports

import { InjectionToken } from '@angular/core';
import type { INavigationItem } from './INavigationItem';

// #endregion

export const NAVIGATION_ITEMS = new InjectionToken<readonly INavigationItem[]>('NAVIGATION_ITEMS');
