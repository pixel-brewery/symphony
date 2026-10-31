// #region Imports

import { z } from 'zod';
import { storageUsageSchema } from './StorageUsageSchema';

// #endregion

export type StorageUsageDto = z.infer<typeof storageUsageSchema>;
