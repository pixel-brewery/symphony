export interface IDeliveryContext {
  id: string;
  workspaceId: string;
  displayName: string;
  workItemSourceIds: readonly string[];
  repositoryBindingIds: readonly string[];
  ciBindingIds: readonly string[];
  agentTeamId: string;
  defaultRepositoryBindingId?: string;
  enabled: boolean;
}
