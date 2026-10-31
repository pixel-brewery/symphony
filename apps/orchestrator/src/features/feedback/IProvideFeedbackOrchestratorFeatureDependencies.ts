// #region Imports
import { type IFeedbackIntakePort } from '@symphony/application-feedback';
// #endregion

/**
 * Consumes only the capabilities required by feedback orchestration.
 *
 * @public
 */
export interface IProvideFeedbackOrchestratorFeatureDependencies {
  readonly feedbackIntake: Pick<IFeedbackIntakePort, 'testSource'>;
}
