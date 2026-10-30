// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion

/**
 * Consumes only the capabilities required by skillRoots orchestration.
 *
 * @public
 */
export interface ICreateRepositorySkillRootReaderDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
}
