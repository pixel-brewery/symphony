// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type IExecutionRepository } from '@symphony/application-execution';
// #endregion

/**
 * Consumes only the capabilities required by executionBindings orchestration.
 *
 * @public
 */
export interface ICreateExecutionBindingsDependencies {
  readonly deletingWorkspaceIds: () => ReadonlySet<string>;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly repository: Pick<IExecutionRepository, 'listGoals'>;
}
