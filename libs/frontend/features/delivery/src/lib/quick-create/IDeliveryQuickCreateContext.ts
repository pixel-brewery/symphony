// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** The existing authoring availability consumed by Delivery's create action. @public */
export interface IDeliveryQuickCreateContext {
  readonly canCreatePullRequest: Signal<boolean>;
}
