// #region Imports

import type { AgentRouteCostClass, AgentRouteStrategy } from '@symphony/domain-ai';

// #endregion

export interface IAgentRouteDescriptor {
  readonly routing: {
    readonly workspaceId: string;
    readonly agentProfileId: string;
    readonly routePolicyId: string;
    readonly routeCandidateId: string;
    readonly providerId?: string;
    readonly strategy: AgentRouteStrategy;
    readonly costClass: AgentRouteCostClass;
    readonly qualityScore?: number;
    readonly priority: number;
    readonly sessionAffinity: boolean;
    readonly maxParallelExecutions: number;
  };
}
