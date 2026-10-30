// #region Imports

import { z } from 'zod';
import { persistedMobileAccessSchema } from './PersistedMobileAccessSchema';

// #endregion

export type PersistedMobileAccess = z.infer<typeof persistedMobileAccessSchema>;
