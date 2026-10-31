export interface IWorkItemAgentAssignment {
  id: string;
  workspaceId: string;
  workItemId: string;
  agentTeamId: string;
  responsibleAgentId: string;
  objective: string;
  assignedAt: string;
  updatedAt: string;
}
