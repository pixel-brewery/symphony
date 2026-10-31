/**
 * One acceptance criterion of a work item's implementation plan and whether it is met.
 *
 * @public
 */
export interface IWorkItemAcceptanceCriterion {
  readonly text: string;
  readonly met: boolean;
}
