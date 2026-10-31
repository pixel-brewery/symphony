// #region Imports

import { z } from 'zod';
import { storageStatusSchema } from './StorageStatusSchema';

// #endregion

export type StorageStatusDto = z.infer<typeof storageStatusSchema>;
