// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const feedbackIntakeSourceSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  provider: z.literal('microsoft-teams'),
  tenantId: z.uuid(),
  clientId: z.uuid(),
  credentialRef: z
    .string()
    .trim()
    .regex(/^env:[A-Za-z_][A-Za-z0-9_]*$/u)
    .optional(),
  teamId: z.uuid(),
  channelId: identifierSchema.max(512),
  targetWorkItemSourceId: identifierSchema,
  targetRepositoryBindingId: identifierSchema,
  enabled: z.boolean(),
});
