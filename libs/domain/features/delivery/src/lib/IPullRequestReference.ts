/**
 * Provider-neutral links identifying a pull request and its source branch.
 *
 * @public
 */
export interface IPullRequestReference {
  number: number;
  externalUrl: string;
  branchUrl: string;
}
