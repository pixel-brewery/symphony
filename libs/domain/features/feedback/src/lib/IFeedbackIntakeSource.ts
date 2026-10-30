/**
 * Workspace-owned inbound source that creates feedback items through an existing tracker.
 *
 * @public
 */
export interface IFeedbackIntakeSource {
  id: string;
  workspaceId: string;
  displayName: string;
  provider: 'microsoft-teams';
  tenantId: string;
  clientId: string;
  credentialRef?: string;
  teamId: string;
  channelId: string;
  targetWorkItemSourceId: string;
  targetRepositoryBindingId: string;
  enabled: boolean;
}
