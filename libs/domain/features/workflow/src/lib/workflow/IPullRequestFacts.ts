/**
 * Pull-request facts a producer proves alongside a run result. The supervisor's guards judge
 * these against the record; they are never assumed.
 */
export interface IPullRequestFacts {
  readonly id: string;
  readonly headCommitSha: string;
  readonly checksPassed: boolean;
  readonly merged: boolean;
  readonly mergeCommitSha?: string;
  readonly targetBranchContainsCommit: boolean;
}
