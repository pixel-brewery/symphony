// #region Imports

import { z } from 'zod';

// #endregion

export const mobilePairingProposalRequestSchema = z
  .object({
    challenge: z.string().min(32).max(256),
    deviceName: z.string().trim().min(1).max(120),
  })
  .strict();
