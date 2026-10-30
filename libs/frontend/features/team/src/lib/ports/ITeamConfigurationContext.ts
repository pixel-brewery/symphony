// #region Imports

import type { ITeamSettingsContext } from './ITeamSettingsContext';

// #endregion

/**
 * Settings and native-tool capabilities consumed by Team without an AI implementation dependency.
 *
 * @public
 */
export type ITeamConfigurationContext = Pick<
  ITeamSettingsContext,
  | 'settings'
  | 'nativeInstallAvailable'
  | 'configurationBusy'
  | 'editorBusy'
  | 'connections'
  | 'runtimeHealth'
  | 'runtimeDependencyInstallBusy'
  | 'saveSettings'
  | 'refreshConfiguration'
  | 'refreshProviderConnections'
  | 'installRuntimeDependency'
>;
