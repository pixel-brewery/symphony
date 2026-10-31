// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** CI's consumed operations on the existing validated whole-settings writer. @public */
export interface ICiSettingsConfiguration {
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  refreshConfiguration(): Promise<void>;
  refreshStorageStatus(silent?: boolean): Promise<void>;
}
