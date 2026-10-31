// #region Imports

import { z } from 'zod';

// #endregion

export const runtimeHealthSchema = z.object({
  status: z.enum(['starting', 'ready', 'degraded']),
  utilityProcess: z.boolean(),
  database: z.boolean(),
  homebrew: z.object({ available: z.boolean(), version: z.string().optional() }),
  git: z.object({ available: z.boolean(), version: z.string().optional() }),
  githubCli: z.object({ available: z.boolean(), version: z.string().optional() }),
  agents: z.object({
    codex: z.object({ available: z.boolean(), version: z.string().optional() }),
    claude: z.object({ available: z.boolean(), version: z.string().optional() }),
    opencode: z.object({ available: z.boolean(), version: z.string().optional() }),
  }),
});
