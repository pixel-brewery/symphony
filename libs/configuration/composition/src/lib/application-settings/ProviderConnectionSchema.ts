// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const providerConnectionSchema = z.discriminatedUnion('kind', [
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('azure-devops'),
    displayName: identifierSchema,
    organization: identifierSchema,
    tenantId: identifierSchema.optional(),
    credentialRef: identifierSchema.optional(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('github'),
    displayName: identifierSchema,
    hostname: identifierSchema,
    accountLogin: identifierSchema.optional(),
    gitProtocol: z.enum(['https', 'ssh']),
    credentialRef: identifierSchema.optional(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('codex'),
    displayName: identifierSchema,
    credentialSource: z.enum(['user-home', 'isolated']),
    credentialRef: identifierSchema.optional(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('claude'),
    displayName: identifierSchema,
    credentialSource: z.literal('isolated').default('isolated'),
    credentialRef: identifierSchema.optional(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    kind: z.literal('opencode'),
    displayName: identifierSchema,
    credentialRef: identifierSchema.optional(),
    gateway: z
      .object({
        providerId: identifierSchema.regex(/^[a-z0-9][a-z0-9_-]*$/u),
        displayName: identifierSchema,
        baseUrl: z.url().refine(
          (value) => {
            const url = new URL(value);
            return (
              url.protocol === 'https:' ||
              (url.protocol === 'http:' &&
                (url.hostname === '127.0.0.1' ||
                  url.hostname === 'localhost' ||
                  url.hostname === '::1'))
            );
          },
          { message: 'An AI gateway must use HTTPS, except for a loopback-only local gateway.' },
        ),
        protocol: z.literal('openai-compatible'),
      })
      .optional(),
  }),
]);
