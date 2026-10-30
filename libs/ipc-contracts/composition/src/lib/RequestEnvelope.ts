// #region Imports

import { z } from 'zod';
import { requestEnvelopeSchema } from './RequestEnvelopeSchema';

// #endregion

export type RequestEnvelope = z.infer<typeof requestEnvelopeSchema>;
