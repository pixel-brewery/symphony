// #region Imports
import { type AnalyzerService } from '@symphony/application-execution';
import { type WorkflowEngineService } from '@symphony/application-workflow';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by workflow orchestration.
 *
 * @public
 */
export interface IProvideWorkflowOrchestratorFeatureDependencies {
  readonly storageGovernor: IStorageWriteAdmission;
  readonly service: Pick<AnalyzerService, 'loadWorkItemDetails'>;
  readonly workflowEngine: Pick<
    WorkflowEngineService,
    'applyOperatorDecision' | 'auditTrail' | 'record' | 'answerHumanRequest'
  >;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
}
