// #region Imports

import { InjectionToken } from '@angular/core';
import type { IQuickCreateItemSource } from '../models/IQuickCreateItemSource';

// #endregion

/** The registered feature-owned authoring sources. @public */
export const QUICK_CREATE_SOURCES = new InjectionToken<readonly IQuickCreateItemSource[]>(
  'QUICK_CREATE_SOURCES',
);
