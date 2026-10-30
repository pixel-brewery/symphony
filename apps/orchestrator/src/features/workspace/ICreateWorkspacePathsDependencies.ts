// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion

/**
 * Consumes only the capabilities required by workspacePaths orchestration.
 *
 * @public
 */
export interface ICreateWorkspacePathsDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly configurationRoot: string;
}
