// #region Imports
import { type OrchestratorSettingsState } from './OrchestratorSettingsState';
// #endregion

/**
 * Consumes only the capabilities required by projectionScope orchestration.
 *
 * @public
 */
export interface ICreateRemoteProjectionScopeDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
}
