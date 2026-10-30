// #region Imports

import type { AgentRouteCostPolicy } from '@symphony/domain-ai';
import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

export interface IExecutionBindingSnapshot {
  workspaceId: string;
  deliveryContextId: string;
  workItemSourceId: string;
  workTrackingConnectionId: string;
  repositoryBindingIds: readonly string[];
  sourceControlConnectionIds: readonly string[];
  ciBindingIds: readonly string[];
  skillFlowRole: SkillFlowRole;
  agentTeamId: string;
  positionId: string;
  agentRoutePolicyId: string;
  /** Missing only on execution records created before route-level affinity was introduced. */
  agentRouteCandidateId?: string;
  aiConnectionId: string;
  agentProfileId: string;
  model: string | null;
  reasoningEffort: string | null;
  costPolicy?: AgentRouteCostPolicy;
  contractVersion?: number;
}
