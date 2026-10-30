// #region Imports

import { inject } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { WORK_CONNECTION_OPERATIONS } from '@symphony/frontend-core/work';
import type { IWorkSourceSettingsContext } from '../ports/IWorkSourceSettingsContext';

// #endregion

/** Reuses Work's actual source owner and the existing configuration/snapshot writers. @internal */
export function createWorkSourceSettingsContext(): IWorkSourceSettingsContext {
  const configuration = inject(ConfigurationStore);
  const connections = inject(WORK_CONNECTION_OPERATIONS);
  const synchronizer = inject(OrchestrationSynchronizer);
  return {
    settings: configuration.settings,
    connections: configuration.connections,
    configurationBusy: configuration.configurationBusy,
    editorBusy: configuration.editorBusy,
    saveSettings: (settings, message) => configuration.saveSettings(settings, message),
    refreshConfiguration: () => configuration.refreshConfiguration(),
    refreshProviderConnections: () => configuration.refreshProviderConnections(),
    refresh: (force) => synchronizer.refresh(force),
    connectAzureDevOps: (id, token) => connections.connectAzureDevOps(id, token),
    disconnectAzureDevOps: (id) => connections.disconnectAzureDevOps(id),
    listGitHubProjects: (input) => connections.listGitHubProjects(input),
    listWorkItemSourceColumns: (input) => connections.listWorkItemSourceColumns(input),
  };
}
