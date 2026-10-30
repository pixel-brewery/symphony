// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type WorkItemService } from '@symphony/application-work';
import { type AnalyzerService } from '@symphony/application-execution';
import { type WorkflowEngineService } from '@symphony/application-workflow';
import { type GitHubProjectTracker } from '@symphony/providers-github';
import { type IWorkTrackingPort } from '@symphony/providers-work';
import { type SimulatedProjectQueries } from '@symphony/providers-simulated';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by work orchestration.
 *
 * @public
 */
export interface IProvideWorkOrchestratorFeatureDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly workItemService: Pick<
    WorkItemService,
    'metadata' | 'create' | 'update' | 'move' | 'comment' | 'draft' | 'cancelDraft'
  >;
  readonly service: Pick<AnalyzerService, 'loadWorkItemDetails'>;
  readonly workflowEngine: Pick<WorkflowEngineService, 'adoptOperatorStage'>;
  readonly storageGovernor: IStorageWriteAdmission;
  readonly githubProjectTracker:
    Pick<GitHubProjectTracker, 'listDraftProjects' | 'listProjects'> | undefined;
  readonly tracker: Pick<IWorkTrackingPort, 'listSourceColumns'>;
  readonly simulatedGitHubProjects: SimulatedProjectQueries['listProjects'];
}
