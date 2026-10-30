// #region Imports

import { z } from 'zod';
import { utilityEventEnvelopeSchema } from './UtilityEventEnvelopeSchema';

// #endregion

export type UtilityEventEnvelope = z.infer<typeof utilityEventEnvelopeSchema>;
