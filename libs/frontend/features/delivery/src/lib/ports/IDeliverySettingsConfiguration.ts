// #region Imports

import type { ApplicationSettingsDto, RequestPayload } from '@symphony/ipc-contracts-composition';

// #endregion

/** The existing validated configuration transaction and consumed account command. @public */
export interface IDeliverySettingsConfiguration {
  /** Whether the actual Work source-authentication participant is included. @public @readonly */
  readonly sourceConnectionsAvailable: boolean;
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
  refreshConfiguration(): Promise<void>;
  synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
  ): ApplicationSettingsDto;
  connectGitHub(input: RequestPayload<'github.login.start'>): Promise<boolean>;
}
