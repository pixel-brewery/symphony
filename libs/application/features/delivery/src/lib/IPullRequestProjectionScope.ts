/** Identity of the selected delivery read model, captured before provider reads. */
export interface IPullRequestProjectionScope {
  readonly workspaceIds: readonly string[];
  readonly pullRequests: string;
}
