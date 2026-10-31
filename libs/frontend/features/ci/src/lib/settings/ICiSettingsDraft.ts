// #region Imports

import type { WritableSignal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** The single set of unsaved CI configuration values for one Settings route session. @public */
export interface ICiSettingsDraft {
  settings: ApplicationSettingsDto | undefined;
  readonly localCi: WritableSignal<ApplicationSettingsDto['localCi']>;
  readonly workspaceLocalCi: WritableSignal<Readonly<Record<string, boolean>>>;
  readonly setupScripts: WritableSignal<Readonly<Record<string, string>>>;
}
