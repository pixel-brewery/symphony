// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type AnalyzerService } from '@symphony/application-execution';
import { type GitHubCloudProvider } from '@symphony/providers-github';
import {
  type SimulatedPullRequestDelivery,
  type SimulatedPullRequestAuthoring,
} from '@symphony/providers-simulated';
import { type DeliveryService } from '@symphony/application-delivery';
import { type WorkTrackingProjectionService } from '@symphony/application-work';
// #endregion

/**
 * Consumes only the capabilities required by delivery orchestration.
 *
 * @public
 */
export interface IProvideDeliveryOrchestratorFeatureDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly service: Pick<AnalyzerService, 'publishPullRequest' | 'executionState'>;
  readonly github: Pick<
    GitHubCloudProvider,
    | 'listBranches'
    | 'compareBranches'
    | 'createPullRequest'
    | 'updateListedPullRequestBranch'
    | 'readDelivery'
  >;
  readonly simulatedPullRequestDelivery:
    Pick<SimulatedPullRequestDelivery, 'updateListedPullRequestBranch'> | undefined;
  readonly deliveryService: Pick<DeliveryService, 'preview' | 'start' | 'list' | 'reconcile'>;
  readonly workTrackingProjection: Pick<WorkTrackingProjectionService, 'cachedWorkItems'>;
  readonly simulatedPullRequestBranches: SimulatedPullRequestAuthoring['listBranches'];
  readonly simulatedPullRequestComparison: SimulatedPullRequestAuthoring['compareBranches'];
  readonly simulatedPullRequestCreation: SimulatedPullRequestAuthoring['createPullRequest'];
}
