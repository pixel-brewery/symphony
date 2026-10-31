// #region Imports

import { z } from 'zod';
import { skillFlowRoles } from '@symphony/domain-skills';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const agentTeamSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  description: z.string().trim(),
  assignments: z.array(
    z.object({
      role: z.enum(skillFlowRoles),
      primaryAgentId: identifierSchema,
      fallbackAgentIds: z.array(identifierSchema),
      skillId: identifierSchema.nullable(),
    }),
  ),
});
