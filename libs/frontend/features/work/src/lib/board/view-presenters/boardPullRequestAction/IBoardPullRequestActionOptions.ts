export interface IBoardPullRequestActionOptions {
  readonly localCiEnabled: boolean;
  /** Run the local runner is busy with, if any. Only one local run exists at a time. */
  readonly localRunId?: string;
}
