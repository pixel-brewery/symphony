/**
 * Reports the observed, baselined and processed feedback outcomes of one synchronization.
 *
 * @public
 */
export interface IFeedbackIntakeSynchronizationResult {
  observed: number;
  baselined: number;
  created: number;
  recovered: number;
  deferred: number;
  failed: number;
}
