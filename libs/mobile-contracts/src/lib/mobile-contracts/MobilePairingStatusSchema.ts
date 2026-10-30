// #region Imports

import { z } from 'zod';

// #endregion

export const mobilePairingStatusSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('pending') }),
  z.object({ state: z.literal('rejected') }),
  z.object({ state: z.literal('expired') }),
  z.object({
    state: z.literal('approved'),
    deviceId: z.string().min(1),
    token: z.string().min(32).max(512).optional(),
  }),
]);
