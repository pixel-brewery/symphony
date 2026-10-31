/**
 * The combined state of a pull request's checks; `none` when no workflow ran on its branch.
 *
 * @public
 */
export type PullRequestChecksState = 'none' | 'failing' | 'running' | 'passed' | 'cancelled';
