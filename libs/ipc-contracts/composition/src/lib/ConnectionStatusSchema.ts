// #region Imports

import { z } from 'zod';

// #endregion

export const connectionStatusSchema = z.object({
  azureDevOps: z.object({
    accounts: z
      .array(
        z.object({
          id: z.string(),
          displayName: z.string(),
          organization: z.string(),
          authenticated: z.boolean(),
          method: z.enum(['pat', 'environment', 'entra']).optional(),
        }),
      )
      .readonly(),
  }),
  github: z.object({
    cliAvailable: z.boolean(),
    accounts: z
      .array(
        z.object({
          id: z.string(),
          hostname: z.string(),
          login: z.string(),
          active: z.boolean(),
          gitProtocol: z.enum(['https', 'ssh']).optional(),
          scopes: z.array(z.string()).readonly(),
        }),
      )
      .readonly(),
    error: z.string().optional(),
  }),
  codex: z.object({
    cliAvailable: z.boolean(),
    version: z.string().optional(),
    accounts: z
      .array(
        z.object({
          id: z.string(),
          displayName: z.string(),
          authenticated: z.boolean(),
          method: z.enum(['chatgpt', 'api-key', 'unknown']).optional(),
          error: z.string().optional(),
        }),
      )
      .readonly(),
    error: z.string().optional(),
  }),
  claude: z.object({
    cliAvailable: z.boolean(),
    version: z.string().optional(),
    accounts: z
      .array(
        z.object({
          id: z.string(),
          displayName: z.string(),
          authenticated: z.boolean(),
          method: z.enum(['subscription', 'api-key', 'unknown']).optional(),
          error: z.string().optional(),
        }),
      )
      .readonly(),
    error: z.string().optional(),
  }),
});
