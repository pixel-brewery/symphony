// #region Imports

import { z } from 'zod';
import { agentAuthorityModes } from '@symphony/domain-team';
import { agentCapabilities } from '@symphony/domain-ai';
import { skillFlowRoles } from '@symphony/domain-skills';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const positionDefinitionSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  description: z.string().trim(),
  responsibilities: z.array(identifierSchema),
  allowedRoles: z.array(z.enum(skillFlowRoles)).min(1),
  authority: z.enum(agentAuthorityModes),
  requiredCapabilities: z
    .array(z.enum(agentCapabilities))
    .default(['coding', 'reasoning', 'tool-calling']),
  allowedPathPatterns: z.array(identifierSchema).default(['**']),
  forbiddenPathPatterns: z
    .array(identifierSchema)
    .default(['.git/**', '.env', '.env.*', '**/credentials/**']),
  maximumChangedFiles: z.number().int().min(0).max(10_000).default(100),
  maximumDiffLines: z.number().int().min(0).max(1_000_000).default(20_000),
  maximumIterations: z.number().int().min(1).max(100).default(8),
});
