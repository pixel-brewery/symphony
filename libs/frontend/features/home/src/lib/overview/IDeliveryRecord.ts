/**
 * When one work item reached Done, and when it was qualified, from recorded stage history.
 *
 * @public
 */
export interface IDeliveryRecord {
  /** The delivered work item. @public @readonly */
  readonly workItemId: string;
  /** When it entered the qualified stage (ISO); absent when that move was not recorded. @public @readonly */
  readonly qualifiedAt?: string;
  /** When it reached Done (ISO). @public @readonly */
  readonly doneAt: string;
}
