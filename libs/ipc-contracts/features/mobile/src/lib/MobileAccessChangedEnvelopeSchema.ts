// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates the payload-free Utility Process notice that the mobile access status changed.
 *
 * @remarks The notice carries no status or device data; the renderer reads the status through its typed request.
 * @public
 */
export const mobileAccessChangedEnvelopeSchema = z
  .object({ topic: z.literal('mobile-access.changed') })
  .strict();
