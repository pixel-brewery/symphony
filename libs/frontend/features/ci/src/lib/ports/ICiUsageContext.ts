// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** The configured scope and bindings consumed by the existing CI usage qualification. @public */
export interface ICiUsageContext {
  readonly settings: Signal<
    | Pick<ApplicationSettingsDto, 'activeViewScope' | 'repositoryBindings' | 'ciBindings'>
    | undefined
  >;
}
