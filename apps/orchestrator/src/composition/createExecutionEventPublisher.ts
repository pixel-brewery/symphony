// #region Imports
import { type IExecutionEvent } from '@symphony/domain-execution';
import { type ICreateExecutionEventPublisherDependencies } from './ICreateExecutionEventPublisherDependencies';
// #endregion

/**
 * Owns events commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createExecutionEventPublisher(
  dependencies: ICreateExecutionEventPublisherDependencies,
) {
  const { parentPort, mobileGateway } = dependencies;
  const publish = (event: IExecutionEvent): void => {
    parentPort?.postMessage({ topic: 'execution.event', event });
    mobileGateway?.broadcastSnapshotInvalidated();
  };

  return Object.freeze({ publish });
}
