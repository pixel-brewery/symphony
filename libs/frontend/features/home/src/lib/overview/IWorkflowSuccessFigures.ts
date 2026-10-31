/**
 * Workflow success: succeeded of the succeeded and failed runs of the period, in percent.
 *
 * @public
 */
export interface IWorkflowSuccessFigures {
  /** Success rate of the selected period, in whole percent. @public @readonly */
  readonly current: number;
  /** Success rate of the previous period; absent when the cached runs do not reach back. @public @readonly */
  readonly previous?: number;
  /** Succeeded runs of the selected period. @public @readonly */
  readonly succeeded: number;
  /** Succeeded and failed runs of the selected period. @public @readonly */
  readonly finished: number;
}
