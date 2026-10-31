// #region Imports

import { z } from 'zod';
import { configurationOperationSchema } from '@symphony/ipc-contracts-core';
import { externalServiceIncidentSchema } from './ExternalServiceIncidentSchema';
import { runtimeHealthSchema } from './RuntimeHealthSchema';
import { storageStatusSchema } from './StorageStatusSchema';

// #endregion

/**
 * Owns the validated platform response payloads at the desktop boundary.
 *
 * @public
 */
export const platformResponseSchemas = {
  'health.get': runtimeHealthSchema,
  'runtime-dependencies.install': runtimeHealthSchema,
  'external-services.incidents.get': z.array(externalServiceIncidentSchema).readonly(),
  'storage.status.get': storageStatusSchema,
  'azure-devops.login.start': configurationOperationSchema,
  'azure-devops.logout': configurationOperationSchema,
  'github.login.start': configurationOperationSchema,
  'github.logout': configurationOperationSchema,
} as const;
