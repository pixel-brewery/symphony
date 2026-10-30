// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Keeps Workspace changes on the existing whole-configuration validation and persistence path.
 *
 * @public
 */
export interface IWorkspaceConfiguration {
  /**
   * Saves through the existing aggregate owner.
   *
   * @public
   */
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  /**
   * Clears the provider-account configuration cache after a workspace import or deletion.
   *
   * @public
   */
  clearProviderConfiguration(): void;
  /**
   * Refreshes the existing configuration projection after a validated workspace mutation.
   *
   * @public
   */
  refreshConfiguration(): Promise<void>;
  /**
   * Preserves scope-switch refresh of repository CI usage.
   *
   * @public
   */
  refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent?: boolean,
  ): Promise<boolean>;
}
