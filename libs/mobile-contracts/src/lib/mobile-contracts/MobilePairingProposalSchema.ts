// #region Imports

import { z } from 'zod';

// #endregion

export const mobilePairingProposalSchema = z.object({
  pairingId: z.string().min(1),
  verificationCode: z.string().regex(/^\d{6}$/u),
  expiresAt: z.string(),
});
