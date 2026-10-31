// #region Imports

import { z } from 'zod';

// #endregion

export const desktopResponseEnvelopeSchema = z.discriminatedUnion('ok', [
  z.object({ correlationId: z.string().min(1).max(200), ok: z.literal(true), data: z.unknown() }),
  z.object({
    correlationId: z.string().min(1).max(200),
    ok: z.literal(false),
    error: z.object({ code: z.string().min(1).max(100), message: z.string().min(1).max(1_000) }),
  }),
]);
