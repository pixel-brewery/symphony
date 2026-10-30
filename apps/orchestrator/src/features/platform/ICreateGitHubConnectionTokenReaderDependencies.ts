// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion

/**
 * Consumes only the capabilities required by githubCredentials orchestration.
 *
 * @public
 */
export interface ICreateGitHubConnectionTokenReaderDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
}
