// #region Imports

import { z } from 'zod';
import { persistedMobileDeviceSchema } from './PersistedMobileDeviceSchema';

// #endregion

export type PersistedMobileDevice = z.infer<typeof persistedMobileDeviceSchema>;
