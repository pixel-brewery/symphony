/**
 * The parts of the agentic-delivery policy that decide whether AI may change a pull request's
 * branch to fix failed checks — the `Repair` level of `Fix failed checks`.
 *
 * @public
 */
export interface IRepairPolicy {
  /** Agentic delivery is on. @public @readonly */
  readonly enabled: boolean;
  /** AI may push to managed pull-request branches. @public @readonly */
  readonly managedBranchUpdatesEnabled: boolean;
  /** AI may repair source failures. @public @readonly */
  readonly sourceRepairEnabled: boolean;
  /** AI may repair workflow failures. @public @readonly */
  readonly workflowRepairEnabled: boolean;
}
