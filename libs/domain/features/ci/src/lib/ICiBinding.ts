export interface ICiBinding {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  sourceControlConnectionId: string;
  provider: 'github-actions' | 'simulated';
  displayName: string;
  enabled: boolean;
  /** Repository-scoped opt-in; the global policy must also allow agentic delivery. */
  agenticDeliveryEnabled?: boolean;
}
