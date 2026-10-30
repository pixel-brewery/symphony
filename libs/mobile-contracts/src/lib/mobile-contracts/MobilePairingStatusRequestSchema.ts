// #region Imports

import { z } from 'zod';

// #endregion

export const mobilePairingStatusRequestSchema = z
  .object({
    pairingId: z.string().min(1),
    challenge: z.string().min(32).max(256),
  })
  .strict();
