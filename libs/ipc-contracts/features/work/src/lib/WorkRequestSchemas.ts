// #region Imports

import { z } from 'zod';
import { applicationSettingsSchema } from '@symphony/configuration-composition';
import { workItemSourceSchema } from '@symphony/configuration-work';
import { issueDraftRequestSchema } from './IssueDraftRequestSchema';
import { workItemMutationSchema } from './WorkItemMutationSchema';

// #endregion

/**
 * Owns the validated work request payloads at the desktop boundary.
 *
 * @public
 */
export const workRequestSchemas = {
  'work-items.metadata': z.object({
    repository: z.string().min(1).optional(),
    workspaceId: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
  }),
  'work-items.detail': z.object({ workItemId: z.string().min(1) }),
  'work-items.create': z.object({ item: workItemMutationSchema }),
  'work-items.update': z.object({ workItemId: z.string().min(1), item: workItemMutationSchema }),
  'work-items.move': z.object({
    workItemId: z.string().min(1),
    boardColumnId: z.string().min(1),
  }),
  'work-items.comment': z.object({
    workItemId: z.string().min(1),
    body: z.string().trim().min(1).max(60_000),
  }),
  'work-items.draft': issueDraftRequestSchema,
  'work-items.draft.cancel': z.object({ operationId: z.string().min(1).max(200) }),
  'github.projects.list': z.object({
    draftSettings: applicationSettingsSchema.optional(),
    workspaceId: z.string().min(1),
    connectionId: z.string().min(1),
  }),
  'work-item-sources.columns': z.object({ source: workItemSourceSchema }),
} as const;
