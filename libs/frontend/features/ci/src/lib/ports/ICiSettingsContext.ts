// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';

// #endregion

/** Existing configuration and measured capacity consumed by CI's settings surfaces. @public */
export interface ICiSettingsContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  readonly configurationBusy: Signal<boolean>;
  readonly storageStatus: Signal<StorageStatusDto | undefined>;
}
