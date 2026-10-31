// #region Imports

import type { ApplicationSettingsDto, RequestPayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Consumed settings and provider refresh operations; persistence stays on the single validated writer.
 *
 * @public
 */
export interface IAiConfiguration {
  /** Applies optional Team reconciliation before a single whole-settings save. @public */
  synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
  ): ApplicationSettingsDto;
  /**
   * Persists the current complete settings through the existing validation path.
   *
   * @public
   */
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  /**
   * Hydrates the authoritative configuration.
   *
   * @public
   */
  refreshConfiguration(): Promise<void>;
  /**
   * Reconciles shared provider status after account operations.
   *
   * @public
   */
  refreshProviderConnections(): Promise<void>;
  /**
   * Uses the existing runtime installation owner when a requested CLI is unavailable.
   *
   * @public
   */
  installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean>;
}
