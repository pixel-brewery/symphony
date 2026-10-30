// #region Imports

import { z } from 'zod';

// #endregion

export const mobilePairingChallengeSchema = z.object({
  pairingUrl: z.url(),
  expiresAt: z.string(),
});
