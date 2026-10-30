// #region Imports

import { z } from 'zod';
import { storagePressureSchema } from './StoragePressureSchema';
import { storageUsageSchema } from './StorageUsageSchema';
const resolvedLocalCiPresetSchema = z.object({
  resources: z.object({
    cpus: z.number().int().nonnegative(),
    memoryGiB: z.number().int().nonnegative(),
    diskGiB: z.number().int().nonnegative(),
    cacheGiB: z.number().int().nonnegative(),
  }),
  supported: z.boolean(),
  unavailableReason: z.string().min(1).optional(),
});

// #endregion

export const storageStatusSchema = z.object({
  measuredAt: z.iso.datetime(),
  measured: z.boolean(),
  writable: z.boolean(),
  global: storageUsageSchema,
  localCi: storageUsageSchema,
  localCiCapacity: z.object({
    logicalCpus: z.number().int().positive(),
    totalMemoryBytes: z.number().int().positive(),
    availableStorageBytes: z.number().int().nonnegative(),
    presets: z.object({
      compact: resolvedLocalCiPresetSchema,
      balanced: resolvedLocalCiPresetSchema,
      performance: resolvedLocalCiPresetSchema,
      custom: resolvedLocalCiPresetSchema,
    }),
  }),
  workspaces: z.array(storageUsageSchema).readonly(),
  filesystem: z.object({
    availableBytes: z.number().int().nonnegative(),
    reserveBytes: z.number().int().nonnegative(),
    pressure: storagePressureSchema,
  }),
  error: z.string().min(1).optional(),
});
