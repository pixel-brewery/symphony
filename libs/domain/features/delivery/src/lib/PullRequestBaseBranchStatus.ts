/**
 * Provider-neutral relationship between a pull-request head and its configured base.
 *
 * @public
 */
export type PullRequestBaseBranchStatus = 'current' | 'behind' | 'conflicting' | 'unknown';
