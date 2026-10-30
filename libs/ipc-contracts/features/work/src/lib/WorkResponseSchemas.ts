// #region Imports

import { z } from 'zod';
import { boardColumnCandidateSchema } from './BoardColumnCandidateSchema';
import { gitHubProjectCandidateSchema } from './GitHubProjectCandidateSchema';
import { issueDraftSchema } from './IssueDraftSchema';
import { workItemEditorMetadataSchema } from './WorkItemEditorMetadataSchema';
import { workItemSchema } from './WorkItemSchema';

// #endregion

/**
 * Owns the validated work response payloads at the desktop boundary.
 *
 * @public
 */
export const workResponseSchemas = {
  'work-items.metadata': workItemEditorMetadataSchema,
  'work-items.detail': workItemSchema,
  'work-items.create': workItemSchema,
  'work-items.update': workItemSchema,
  'work-items.move': workItemSchema,
  'work-items.comment': workItemSchema,
  'work-items.draft': issueDraftSchema,
  'work-items.draft.cancel': z.object({ cancelled: z.boolean() }),
  'github.projects.list': z.object({
    projects: z.array(gitHubProjectCandidateSchema).readonly(),
    error: z.string().optional(),
  }),
  'work-item-sources.columns': z.object({
    columns: z.array(boardColumnCandidateSchema).readonly(),
    error: z.string().optional(),
  }),
} as const;
