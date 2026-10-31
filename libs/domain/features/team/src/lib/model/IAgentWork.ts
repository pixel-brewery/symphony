/** One real assignment, execution or queue intent. */
export interface IAgentWork {
  readonly workItemId: string;
  readonly executionId?: string;
  readonly role?: string;
  readonly state:
    'queued' | 'working' | 'needs-input' | 'paused' | 'blocked' | 'completed' | 'failed';
  readonly reason?: string;
  readonly connectionId?: string;
  readonly updatedAt?: string;
}
