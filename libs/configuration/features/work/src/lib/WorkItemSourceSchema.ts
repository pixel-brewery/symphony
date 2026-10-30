// #region Imports

import { z } from 'zod';
import { runtimeStateProjectionSchema } from '@symphony/configuration-workflow';
import { identifierSchema } from '@symphony/configuration-core';
const boardColumnMappingSchema = z.object({
  columnId: identifierSchema,
  stageId: identifierSchema.max(64),
});

// #endregion

export const workItemSourceSchema = z.discriminatedUnion('provider', [
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    connectionId: identifierSchema,
    provider: z.literal('azure-devops'),
    displayName: identifierSchema,
    project: identifierSchema,
    team: identifierSchema.optional(),
    queryId: identifierSchema.optional(),
    wiql: identifierSchema.optional(),
    boardId: identifierSchema.optional(),
    columnMappings: z.array(boardColumnMappingSchema).optional(),
    runtimeStateProjection: runtimeStateProjectionSchema.optional(),
    enabled: z.boolean(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    connectionId: identifierSchema,
    provider: z.literal('github-projects'),
    displayName: identifierSchema,
    ownerType: z.enum(['organization', 'user']),
    owner: identifierSchema,
    projectNumber: z.number().int().positive(),
    columnMappings: z.array(boardColumnMappingSchema).optional(),
    runtimeStateProjection: runtimeStateProjectionSchema.optional(),
    enabled: z.boolean(),
  }),
  z.object({
    id: identifierSchema,
    workspaceId: identifierSchema,
    connectionId: identifierSchema,
    provider: z.literal('simulated'),
    displayName: identifierSchema,
    project: identifierSchema,
    enabled: z.boolean(),
  }),
]);
