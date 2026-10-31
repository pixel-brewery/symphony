/**
 * Why `Repair with AI` cannot start for a pull request:
 *
 * - `unavailable`: this window cannot start executions.
 * - `not-delivered`: Symphony did not publish the pull request from a work item.
 * - `policy`: the automation policy does not allow AI to repair failed checks in this repository.
 * - `busy`: an execution of the work item is already queued or running.
 *
 * @public
 */
export type PullRequestRepairBlock = 'unavailable' | 'not-delivered' | 'policy' | 'busy';
