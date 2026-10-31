// #region Imports

import { InjectionToken, type Signal } from '@angular/core';

// #endregion

/** Read-only fallback mapped by composition to the one Automation runtime draft. @public */
export const CI_RUNTIME_WORKSPACE_ROOT = new InjectionToken<Signal<string>>(
  'CI_RUNTIME_WORKSPACE_ROOT',
);
