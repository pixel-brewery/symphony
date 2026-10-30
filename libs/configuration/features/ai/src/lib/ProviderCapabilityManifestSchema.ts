// #region Imports

import { z } from 'zod';
import { agentCapabilities } from '@symphony/domain-ai';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const providerCapabilityManifestSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  providerId: identifierSchema.regex(/^[a-z0-9][a-z0-9_-]*$/u),
  displayName: identifierSchema,
  runtime: z.enum(['codex', 'claude', 'opencode', 'openai-compatible-gateway']),
  protocol: z.enum(['cli', 'openai-compatible']),
  capabilities: z.array(z.enum(agentCapabilities)).min(1),
  modelDiscovery: z
    .enum(['runtime', 'configured', 'account-catalog'])
    .transform((value) => (value === 'account-catalog' ? ('runtime' as const) : value)),
  officialApi: z.boolean(),
});
