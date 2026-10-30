// #region Imports

import { z } from 'zod';
import { externalHttpUrlSchema } from './ExternalHttpUrlSchema';
import { mobileTicketActionSchema } from './MobileTicketActionSchema';
import { mobileTicketHealthSchema } from './MobileTicketHealthSchema';
import { mobileWorkflowStageIdSchema } from './MobileWorkflowStageIdSchema';

// #endregion

export const mobileTicketSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  externalId: z.string().min(1),
  externalUrl: externalHttpUrlSchema.optional(),
  remoteCommandsAvailable: z.boolean().default(false),
  title: z.string().min(1).max(2_000),
  body: z.string().max(1_000_000).optional(),
  stageId: mobileWorkflowStageIdSchema.optional(),
  /** Server-resolved: the ticket rests in a terminal stage, so no further work is expected. */
  terminal: z.boolean().optional(),
  /** Board column that owns the ticket. */
  boardColumnId: z.string().min(1).optional(),
  stateLabel: z.string().min(1),
  repository: z.string().max(500).optional(),
  labels: z.array(z.string().min(1).max(100)).max(100).readonly(),
  assignees: z.array(z.string().min(1).max(200)).max(100).readonly(),
  externalCoordination: z
    .object({
      action: z.enum(['analyze', 'solve']),
      owner: z.string().min(1).optional(),
    })
    .optional(),
  updatedAt: z.string().optional(),
  health: mobileTicketHealthSchema.optional(),
  /** Steps the ticket stage offers, in the order the desktop offers them. */
  actions: z.array(mobileTicketActionSchema).max(50).readonly().default([]),
  /**
   * Board columns the ticket may be moved to, resolved by the desktop: only columns of the
   * board that owns the ticket are values its provider accepts.
   */
  moveTargetColumnIds: z.array(z.string().min(1)).max(200).readonly().default([]),
  activeExecutionId: z.string().min(1).optional(),
});
