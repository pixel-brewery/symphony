// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Authoritative appearance settings and the existing configuration writer.
 *
 * @public
 */
export interface IPlatformSettingsContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  refreshConfiguration(): Promise<void>;
}
