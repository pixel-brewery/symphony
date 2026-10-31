// #region Imports

import type { AgentRouteCostPolicy } from './AgentRouteCostPolicy';
import type { AgentRouteStrategy } from './AgentRouteStrategy';
import type { IAgentRouteCandidate } from './IAgentRouteCandidate';

// #endregion

export interface IAgentRoutePolicy {
  id: string;
  workspaceId: string;
  displayName: string;
  strategy: AgentRouteStrategy;
  costPolicy: AgentRouteCostPolicy;
  sessionAffinity: boolean;
  maxParallelExecutions: number;
  candidates: readonly IAgentRouteCandidate[];
}
