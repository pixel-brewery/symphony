/**
 * Reports the observed and durable outcomes of one remote-signal synchronization.
 *
 * @public
 */
export interface IAutomationSynchronizationResult {
  observed: number;
  baselined: number;
  started: number;
  completed: number;
  deferred: number;
  ignored: number;
  failed: number;
}
