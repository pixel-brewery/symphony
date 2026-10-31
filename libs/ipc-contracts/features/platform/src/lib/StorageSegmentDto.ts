// #region Imports

import { z } from 'zod';
import { storageSegmentSchema } from './StorageSegmentSchema';

// #endregion

export type StorageSegmentDto = z.infer<typeof storageSegmentSchema>;
