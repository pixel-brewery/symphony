/**
 * One commit a new pull request would carry.
 *
 * @public
 */
export interface IPullRequestComparisonCommit {
  revision: string;
  title: string;
  author?: string;
  committedAt?: string;
}
