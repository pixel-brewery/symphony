// #region Imports

import { z } from 'zod';
import { responseEnvelopeSchema } from './ResponseEnvelopeSchema';

// #endregion

export type ResponseEnvelope = z.infer<typeof responseEnvelopeSchema>;
