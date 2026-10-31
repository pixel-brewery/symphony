// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const portableConnectionSchema = z.discriminatedUnion('kind', [
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('azure-devops'),
    displayName: identifierSchema,
    organization: identifierSchema,
    tenantId: identifierSchema.optional(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('github'),
    displayName: identifierSchema,
    hostname: identifierSchema,
    gitProtocol: z.enum(['https', 'ssh']),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('codex'),
    displayName: identifierSchema,
    credentialSource: z.literal('isolated'),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('claude'),
    displayName: identifierSchema,
    credentialSource: z.literal('isolated'),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('opencode'),
    displayName: identifierSchema,
    gateway: z
      .object({
        providerId: identifierSchema.regex(/^[a-z0-9][a-z0-9_-]*$/u),
        displayName: identifierSchema,
        baseUrl: z.url().refine((value) => value.startsWith('https://'), {
          message: 'An external AI gateway must use HTTPS.',
        }),
        protocol: z.literal('openai-compatible'),
      })
      .optional(),
  }),
]);
