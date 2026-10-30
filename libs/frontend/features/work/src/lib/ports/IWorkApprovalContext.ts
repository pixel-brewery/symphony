// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Only the existing readonly facts consumed by this Work surface. @public */
export interface IWorkApprovalContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
}
