/**
 * Identifies a deferred role resumed by workflow maintenance.
 *
 * @public
 */
export interface IWorkflowExecutionTrigger {
  /**
   * Preserves the workflow origin on the resumed execution.
   *
   * @public
   * @readonly
   */
  readonly origin: 'workflow';
}
