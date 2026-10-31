// #region Imports
import { safeError } from '../../logging/safeError';
import { type ICreateFeedbackSynchronizationCoordinatorDependencies } from './ICreateFeedbackSynchronizationCoordinatorDependencies';
// #endregion

/**
 * Owns feedbackSynchronization commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createFeedbackSynchronizationCoordinator(
  dependencies: ICreateFeedbackSynchronizationCoordinatorDependencies,
) {
  const { settingsState, feedbackIntakeService, logger } = dependencies;
  let lastFeedbackIntakeSynchronizationAt = 0;

  async function synchronizeFeedbackIntake(force: boolean): Promise<void> {
    if (!settingsState.current.feedbackIntakeSources.some((source) => source.enabled)) return;
    const now = Date.now();
    const interval =
      Math.max(1, settingsState.current.runtime.boardRefreshIntervalMinutes) * 60_000;
    if (!force && now - lastFeedbackIntakeSynchronizationAt < interval) return;
    lastFeedbackIntakeSynchronizationAt = now;
    try {
      const result = await feedbackIntakeService.synchronize();
      logger.info({ event: 'feedback-intake.synchronized', ...result });
    } catch (cause) {
      logger.error({ event: 'feedback-intake.synchronization.failed', error: safeError(cause) });
    }
  }

  return Object.freeze({ synchronizeFeedbackIntake });
}
