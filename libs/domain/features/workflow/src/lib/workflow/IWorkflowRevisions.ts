export interface IWorkflowRevisions {
  readonly issueRevision?: string;
  readonly analysisRevision?: string;
  readonly repositoryBaseRevision?: string;
  readonly currentCommitSha?: string;
  readonly verifiedCommitSha?: string;
  readonly acceptedCommitSha?: string;
  readonly mergeCommitSha?: string;
}
