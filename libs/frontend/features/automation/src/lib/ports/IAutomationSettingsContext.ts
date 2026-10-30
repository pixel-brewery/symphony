// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';

// #endregion

/**
 * Authoritative values and existing operations consumed by runtime policy editing.
 *
 * @public
 */
export interface IAutomationSettingsContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  readonly configurationBusy: Signal<boolean>;
  readonly storageStatus: Signal<StorageStatusDto | undefined>;
  /** Whether the selected product supplies the Workspace cleanup owner. @public @readonly */
  readonly workspaceCleanupAvailable: boolean;
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  refreshConfiguration(): Promise<void>;
  refreshStorageStatus(silent?: boolean): Promise<void>;
  unpreparedAutomaticRepositories(
    enabled?: boolean,
  ): readonly ApplicationSettingsDto['repositoryBindings'][number][];
  clearWorkspaces(): Promise<boolean>;
}
