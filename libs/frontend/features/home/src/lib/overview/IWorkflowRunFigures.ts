/**
 * Workflow runs started in the selected period, by outcome.
 *
 * @public
 */
export interface IWorkflowRunFigures {
  /** Every run started in the period, including the ones still running. @public @readonly */
  readonly total: number;
  /** Succeeded runs. @public @readonly */
  readonly succeeded: number;
  /** Failed runs. @public @readonly */
  readonly failed: number;
  /** Cancelled runs. @public @readonly */
  readonly cancelled: number;
  /** Workflow behind most failures of the period, with its failure count. @public @readonly */
  readonly topFailure?: { readonly workflowName: string; readonly failures: number };
}
