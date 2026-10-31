// #region Imports

import { z } from 'zod';
import { desktopResponseEnvelopeSchema } from './DesktopResponseEnvelopeSchema';

// #endregion

export type DesktopResponseEnvelope = z.infer<typeof desktopResponseEnvelopeSchema>;
