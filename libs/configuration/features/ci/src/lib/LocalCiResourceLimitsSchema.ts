// #region Imports

import { localCiResourceMinimums } from '@symphony/domain-ci';
import { z } from 'zod';

// #endregion

export const localCiResourceLimitsSchema = z
  .object({
    cpus: z.number().int().min(localCiResourceMinimums.cpus).max(256),
    memoryGiB: z.number().int().min(localCiResourceMinimums.memoryGiB).max(2_048),
    diskGiB: z.number().int().min(localCiResourceMinimums.diskGiB).max(256),
    cacheGiB: z.number().int().min(localCiResourceMinimums.cacheGiB).max(256),
  })
  .strict();
