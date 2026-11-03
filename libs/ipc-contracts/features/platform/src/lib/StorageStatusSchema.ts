// #region Imports

import { z } from 'zod';
import { storagePressureSchema } from './StoragePressureSchema';
import { storageUsageSchema } from './StorageUsageSchema';

// #endregion

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

const localCiAdmissionBudgetSchema = z.object({
  availableBytes: z.number().int().nonnegative(),
  reserveBytes: z.number().int().nonnegative(),
  requiredGrowthBytes: z.number().int().nonnegative(),
  shortfallBytes: z.number().int().nonnegative(),
});

const localCiAdmissionSchema = z.union([
  localCiAdmissionBudgetSchema.extend({
    state: z.literal('permitted'),
    shortfallBytes: z.literal(0),
  }),
  localCiAdmissionBudgetSchema.extend({
    state: z.literal('blocked'),
    reason: z.enum(['filesystem-reserve', 'managed-limit', 'local-ci-limit', 'workspace-limit']),
    workspaceId: z.string().min(1).optional(),
  }),
  localCiAdmissionBudgetSchema.extend({
    state: z.literal('unknown'),
    reason: z.literal('allocation-pending'),
    shortfallBytes: z.literal(0),
  }),
  z.object({
    state: z.literal('unknown'),
    reason: z.literal('measurement-failed'),
    reserveBytes: z.number().int().nonnegative(),
  }),
]);

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
  localCiAdmission: localCiAdmissionSchema,
  workspaces: z.array(storageUsageSchema).readonly(),
  filesystem: z.object({
    availableBytes: z.number().int().nonnegative(),
    reserveBytes: z.number().int().nonnegative(),
    pressure: storagePressureSchema,
  }),
  error: z.string().min(1).optional(),
});
