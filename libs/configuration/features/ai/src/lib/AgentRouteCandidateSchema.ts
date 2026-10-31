// #region Imports

import { z } from 'zod';
import { agentCapabilities, agentRouteCostClasses } from '@symphony/domain-ai';
import { identifierSchema } from '@symphony/configuration-core';
const freeTierEvidenceSchema = z.object({
  source: identifierSchema,
  checkedAt: z.iso.datetime(),
  commercialUse: z.enum(['allowed', 'restricted', 'unknown']),
  operatorApproved: z.boolean(),
});

// #endregion

export const agentRouteCandidateSchema = z.object({
  id: identifierSchema,
  aiConnectionId: identifierSchema,
  model: identifierSchema.nullable(),
  reasoningEffort: identifierSchema.nullable(),
  costClass: z.enum(agentRouteCostClasses),
  providerId: identifierSchema.default('provider-default'),
  capabilities: z.array(z.enum(agentCapabilities)).default(['coding', 'reasoning', 'tool-calling']),
  qualityScore: z.number().int().min(0).max(100).default(50),
  contextWindow: z.number().int().positive().nullable().default(null),
  freeTierEvidence: freeTierEvidenceSchema.optional(),
  priority: z.number().int().min(0).max(10_000),
  enabled: z.boolean(),
});
