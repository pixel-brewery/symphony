// #region Imports

import { inject } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { WORK_CONNECTION_OPERATIONS } from '@symphony/frontend-core/work';
import { TEAM_CONFIGURATION } from '@symphony/frontend-core/team';
import type { IDeliverySettingsConfiguration } from '../ports/IDeliverySettingsConfiguration';

// #endregion

/** Composes the existing writer and optional Team projector for one settings transaction. @internal */
export function createDeliverySettingsConfiguration(): IDeliverySettingsConfiguration {
  const configuration = inject(ConfigurationStore),
    team = inject(TEAM_CONFIGURATION, { optional: true }),
    connections = inject(WORK_CONNECTION_OPERATIONS, { optional: true });
  return {
    sourceConnectionsAvailable: connections !== null,
    saveSettings: (settings, message) => configuration.saveSettings(settings, message),
    refreshConfiguration: () => configuration.refreshConfiguration(),
    synchronizeDeliveryContext: (settings, workspaceId) =>
      team?.synchronizeDeliveryContext(settings, workspaceId) ?? settings,
    connectGitHub: (input) => connections?.connectGitHub(input) ?? Promise.resolve(false),
  };
}
