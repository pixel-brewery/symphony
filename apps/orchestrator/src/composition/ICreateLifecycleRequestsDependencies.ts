// #region Imports
import { type LocalMobileGateway } from '../mobile-gateway';
import { type AnalyzerService } from '@symphony/application-execution';
import { type WorkItemService } from '@symphony/application-work';
import { type IActiveOperation } from './IActiveOperation';
import { type IActiveLocalCiRun } from '../features/ci/IActiveLocalCiRun';
import { type IActiveRuntimeInstallation } from '../features/platform/IActiveRuntimeInstallation';
// #endregion

/**
 * Consumes only the capabilities required by lifecycle orchestration.
 *
 * @public
 */
export interface ICreateLifecycleRequestsDependencies {
  readonly mobileGateway: Pick<LocalMobileGateway, 'reconcile'>;
  readonly synchronizeRemoteAutomation: (force: boolean) => Promise<void>;
  readonly synchronizeFeedbackIntake: (force: boolean) => Promise<void>;
  readonly service: Pick<
    AnalyzerService,
    | 'reconcileActiveExecutions'
    | 'activeExecutionRecords'
    | 'pauseActiveExecutions'
    | 'cancelActiveExecutions'
  >;
  readonly workItemService: Pick<
    WorkItemService,
    'reactivateActiveDrafts' | 'activeDraftOperations' | 'cancelActiveDrafts'
  >;
  readonly activeVerificationRuns: () => ReadonlyMap<string, IActiveOperation>;
  readonly activeLocalCiRuns: () => ReadonlyMap<string, IActiveLocalCiRun>;
  readonly activeRuntimeDependencyInstallation: () => IActiveRuntimeInstallation | undefined;
}
