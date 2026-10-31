// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated platform request payloads at the desktop boundary.
 *
 * @public
 */
export const platformRequestSchemas = {
  'health.get': z.object({}),
  'runtime-dependencies.install': z.object({
    command: z.enum(['git', 'gh', 'codex', 'claude', 'opencode']),
  }),
  'external-services.incidents.get': z.object({}),
  'storage.status.get': z.object({}),
  'azure-devops.login.start': z.object({
    connectionId: z.string().min(1),
    token: z.string().trim().min(8).max(512),
  }),
  'azure-devops.logout': z.object({ connectionId: z.string().min(1) }),
  'github.login.start': z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('browser'),
      hostname: z.string().min(1),
      gitProtocol: z.enum(['https', 'ssh']),
    }),
    z.object({
      mode: z.literal('token'),
      hostname: z.string().min(1),
      gitProtocol: z.enum(['https', 'ssh']),
      token: z.string().min(20).max(512),
    }),
  ]),
  'github.logout': z.object({ hostname: z.string().min(1), login: z.string().min(1) }),
} as const;
