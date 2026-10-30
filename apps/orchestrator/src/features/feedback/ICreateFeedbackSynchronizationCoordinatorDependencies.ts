// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type FeedbackIntakeService } from '@symphony/application-feedback';
import { type StructuredLogger } from '@symphony/logging';
// #endregion

/**
 * Consumes only the capabilities required by feedbackSynchronization orchestration.
 *
 * @public
 */
export interface ICreateFeedbackSynchronizationCoordinatorDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly feedbackIntakeService: Pick<FeedbackIntakeService, 'synchronize'>;
  readonly logger: Pick<StructuredLogger, 'info' | 'error'>;
}
