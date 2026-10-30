// #region Imports

import { z } from 'zod';
import { mobilePairingStatusSchema } from './MobilePairingStatusSchema';

// #endregion

export type MobilePairingStatus = z.infer<typeof mobilePairingStatusSchema>;
