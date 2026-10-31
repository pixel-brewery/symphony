// #region Imports
import { type IProvideFeedbackOrchestratorFeatureDependencies } from './IProvideFeedbackOrchestratorFeatureDependencies';
import { feedbackRequestSchemas, feedbackResponseSchemas } from '@symphony/ipc-contracts-feedback';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns feedback commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideFeedbackOrchestratorFeature(
  dependencies: IProvideFeedbackOrchestratorFeatureDependencies,
) {
  const { feedbackIntake } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'feedback-intake.test',
      feedbackRequestSchemas['feedback-intake.test'],
      feedbackResponseSchemas['feedback-intake.test'],
      async (input) => {
        return feedbackIntake.testSource(input.source);
      },
    ),
  ]);
  return Object.freeze({ id: 'feedback', handlers });
}
