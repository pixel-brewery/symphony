// #region Imports

import { z } from 'zod';
import { mobilePairingStatusRequestSchema } from './MobilePairingStatusRequestSchema';

// #endregion

export type MobilePairingStatusRequest = z.infer<typeof mobilePairingStatusRequestSchema>;
