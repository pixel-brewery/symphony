/**
 * Pull request an operator authors directly, outside execution delivery.
 *
 * @public
 */
export interface IPullRequestDraft {
  repositoryBindingId: string;
  targetBranch: string;
  sourceBranch: string;
  title: string;
  body: string;
  draft: boolean;
}
