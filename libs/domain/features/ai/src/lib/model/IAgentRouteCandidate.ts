// #region Imports

import type { AgentCapability } from './AgentCapability';
import type { AgentRouteCostClass } from './AgentRouteCostClass';

// #endregion

export interface IAgentRouteCandidate {
  id: string;
  aiConnectionId: string;
  model: string | null;
  reasoningEffort: string | null;
  costClass: AgentRouteCostClass;
  providerId?: string;
  capabilities?: readonly AgentCapability[];
  qualityScore?: number;
  contextWindow?: number | null;
  freeTierEvidence?: {
    source: string;
    checkedAt: string;
    commercialUse: 'allowed' | 'restricted' | 'unknown';
    operatorApproved: boolean;
  };
  priority: number;
  enabled: boolean;
}
