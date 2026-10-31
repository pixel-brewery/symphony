// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated ai request payloads at the desktop boundary.
 *
 * @public
 */
export const aiRequestSchemas = {
  'codex.configuration.get': z.object({ accountId: z.string().min(1) }),
  'ai.models.get': z
    .object({
      runtime: z.literal('opencode'),
      workspaceId: z.string().min(1),
      connectionId: z.string().min(1).optional(),
      credentialRef: z.string().trim().min(1).max(512).optional(),
      gateway: z
        .object({
          providerId: z.string().trim().min(1).max(128),
          displayName: z.string().trim().min(1).max(200),
          baseUrl: z.url(),
        })
        .optional(),
    })
    .refine((input) => !(input.connectionId && (input.credentialRef || input.gateway)), {
      message: 'A saved AI account cannot be combined with draft connection settings.',
    }),
  'ai.intelligence.get': z.object({
    targets: z
      .array(
        z.object({
          model: z.string().min(1).max(200),
          reasoningEffort: z.string().min(1).max(64).nullable(),
        }),
      )
      .max(200)
      .readonly(),
  }),
  'opencode.credentials.import': z.object({ accountId: z.string().min(1) }),
  'codex.login.start': z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('chatgpt'), accountId: z.string().min(1) }),
    z.object({
      mode: z.literal('api-key'),
      accountId: z.string().min(1),
      apiKey: z.string().min(20).max(512),
    }),
  ]),
  'codex.logout': z.object({ accountId: z.string().min(1) }),
  'claude.login.start': z.object({ accountId: z.string().min(1) }),
  'claude.login.complete': z.object({
    accountId: z.string().min(1),
    authorizationCode: z.string().trim().min(1).max(4_096),
  }),
  'claude.logout': z.object({ accountId: z.string().min(1) }),
} as const;
