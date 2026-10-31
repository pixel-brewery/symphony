// #region Imports

import { z } from 'zod';
import { storagePressureSchema } from './StoragePressureSchema';
import { storageSegmentSchema } from './StorageSegmentSchema';

// #endregion

export const storageUsageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  allocatedBytes: z.number().int().nonnegative(),
  limitBytes: z.number().int().nonnegative(),
  usagePercent: z.number().int().min(0).max(100),
  pressure: storagePressureSchema,
  segments: z.array(storageSegmentSchema).readonly(),
});
