// #region Imports

import { z } from 'zod';
import { agentRouteCostPolicies, agentRouteStrategies } from '@symphony/domain-ai';
import { agentRouteCandidateSchema } from './AgentRouteCandidateSchema';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const agentRoutePolicySchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  strategy: z.enum(agentRouteStrategies),
  costPolicy: z.enum(agentRouteCostPolicies),
  sessionAffinity: z.boolean(),
  maxParallelExecutions: z.number().int().min(1).max(32),
  candidates: z.array(agentRouteCandidateSchema).min(1),
});
