// #region Imports

import { z } from 'zod';

// #endregion

export const responseEnvelopeSchema = z.discriminatedUnion('ok', [
  z.object({ correlationId: z.string(), ok: z.literal(true), data: z.unknown() }),
  z.object({
    correlationId: z.string(),
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);
