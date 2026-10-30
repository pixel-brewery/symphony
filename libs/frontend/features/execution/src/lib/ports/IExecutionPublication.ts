/** Keeps publication and its shared busy state with the existing Delivery owner. @public */
export interface IExecutionPublication {
  publishPullRequest(executionId: string): Promise<boolean>;
}
