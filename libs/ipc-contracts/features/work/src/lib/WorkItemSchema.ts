// #region Imports

import { z } from 'zod';
import { assistanceActionSchema } from './AssistanceActionSchema';
import { projectFieldValueSchema } from './ProjectFieldValueSchema';
import { workItemAssigneeSchema } from './WorkItemAssigneeSchema';
import { workItemCommentSchema } from './WorkItemCommentSchema';
import { workflowStageIdSchema } from '@symphony/ipc-contracts-workflow';

// #endregion

export const workItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  externalId: z.string(),
  externalUrl: z.url().optional(),
  title: z.string(),
  body: z.string(),
  detailState: z.enum(['summary', 'complete']).optional(),
  bodyFormat: z.enum(['plain-text', 'markdown', 'html']).optional(),
  comments: z.array(workItemCommentSchema).readonly().optional(),
  workItemType: z.string().optional(),
  revision: z.number().int().nonnegative().optional(),
  nativeState: z.string().optional(),
  stageId: workflowStageIdSchema.optional(),
  boardColumnId: z.string().min(1).optional(),
  provider: z.string(),
  repository: z.string(),
  repositoryBindingIds: z.array(z.string().min(1)).readonly().optional(),
  projectFields: z.array(projectFieldValueSchema).readonly().optional().default([]),
  assistanceAction: assistanceActionSchema.optional(),
  coordination: z
    .object({
      state: z.literal('claimed'),
      claimId: z.string().min(1),
      action: z.enum(['analyze', 'solve']),
      owner: z.string().min(1).optional(),
    })
    .optional(),
  labels: z.array(z.string()).readonly(),
  assignees: z.array(workItemAssigneeSchema).readonly(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
