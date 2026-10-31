// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** The existing loaded-state projection supplied by the owning page. @public */
export interface IWidgetHostContext {
  readonly hasSnapshot: Signal<boolean>;
}
