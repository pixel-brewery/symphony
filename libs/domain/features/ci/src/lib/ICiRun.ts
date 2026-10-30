export interface ICiRun {
  id: string;
  workspaceId: string;
  ciBindingId: string;
  repositoryBindingId: string;
  workflowId?: string;
  name: string;
  title?: string;
  event?: string;
  actor?: string;
  runNumber?: number;
  status: 'queued' | 'in-progress' | 'succeeded' | 'failed' | 'cancelled';
  branch?: string;
  revision?: string;
  externalUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  /** Provider run attempt used to distinguish reruns of one workflow run. */
  runAttempt?: number;
}
