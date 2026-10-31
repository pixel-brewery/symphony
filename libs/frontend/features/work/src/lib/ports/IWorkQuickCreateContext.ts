// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** Only the existing readonly facts consumed by this Work surface. @public */
export interface IWorkQuickCreateContext {
  readonly canCreateWorkItem: Signal<boolean>;
}
