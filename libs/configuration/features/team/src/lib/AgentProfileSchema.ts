// #region Imports

import { z } from 'zod';
import { defaultAgentAppearance } from '@symphony/domain-team';
import { agentAppearanceSchema } from './AgentAppearanceSchema';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const agentProfileSchema = z
  .object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    displayName: identifierSchema,
    positionId: identifierSchema,
    routePolicyId: identifierSchema,
    qualificationTags: z.array(identifierSchema),
    enabled: z.boolean(),
    appearance: agentAppearanceSchema.optional(),
  })
  .transform((profile) => ({
    ...profile,
    appearance: profile.appearance ?? defaultAgentAppearance(profile.id),
  }));
