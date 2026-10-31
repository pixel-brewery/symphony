// #region Imports
import { type StructuredLogger } from '@symphony/logging';
import { type WorkflowMaintenanceService } from '@symphony/application-workflow';
import { type LocalCiTakeoverService } from '../local-ci-takeover/LocalCiTakeoverService';
import { type AnalyzerService } from '@symphony/application-execution';
import { type OrchestratorSettingsState } from './OrchestratorSettingsState';
import { type LocalMobileGateway } from '../mobile-gateway';
// #endregion

/**
 * Consumes only the capabilities required by background orchestration.
 *
 * @public
 */
export interface ICreateBackgroundCoordinatorDependencies {
  readonly logger: Pick<StructuredLogger, 'error' | 'info'>;
  readonly synchronizeRemoteAutomation: (force: boolean) => Promise<void>;
  readonly synchronizeFeedbackIntake: (force: boolean) => Promise<void>;
  readonly runAutonomousCycle: (force: boolean) => Promise<void>;
  readonly workflowMaintenance: Pick<WorkflowMaintenanceService, 'runOnce'>;
  readonly localCiTakeover: Pick<LocalCiTakeoverService, 'reconcile'>;
  readonly service: Pick<
    AnalyzerService,
    'renewActiveClaims' | 'releaseAbandonedClaims' | 'recoverInterruptedExecutions'
  >;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly enforceStorageSafety: () => Promise<void>;
  readonly prepareLocalCiRuntime: () => Promise<void>;
  readonly mobileGateway: Pick<LocalMobileGateway, 'reconcile'>;
}
