// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';
import { orbitCelestialBodySchema } from './OrbitCelestialBodySchema';

// #endregion

export const deliveryTargetSchema = z
  .object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    repositoryBindingId: identifierSchema,
    displayName: identifierSchema,
    kind: z.enum(['environment', 'release-channel', 'installation']),
    environment: identifierSchema,
    production: z.boolean(),
    celestialBody: orbitCelestialBodySchema.optional(),
    workflowId: identifierSchema.optional(),
    versionInput: identifierSchema.optional(),
    environmentInput: identifierSchema.optional(),
    operationInput: identifierSchema.optional(),
  })
  .refine(
    (target) => !target.workflowId || Boolean(target.versionInput),
    'A delivery workflow needs an immutable version input.',
  );
