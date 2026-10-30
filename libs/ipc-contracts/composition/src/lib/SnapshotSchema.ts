// #region Imports

import { z } from 'zod';
import { workflowDefinitionSchema } from '@symphony/configuration-workflow';
import {
  boardColumnSchema,
  projectFieldDefinitionSchema,
  workItemSchema,
} from '@symphony/ipc-contracts-work';
import { ciRunSchema, ciWorkflowSchema, localCiExecutionSchema } from '@symphony/ipc-contracts-ci';
import {
  executionEventSchema,
  executionQueueEntrySchema,
  executionRecordSchema,
  deliveryGroupProposalSchema,
  deliveryGroupSchema,
  goalRecordSchema,
} from '@symphony/ipc-contracts-execution';
import { pullRequestSummarySchema } from '@symphony/ipc-contracts-delivery';
import { runtimeHealthSchema } from '@symphony/ipc-contracts-platform';
import { remoteDataStatusSchema } from '@symphony/ipc-contracts-core';
import { skillManifestSchema } from '@symphony/ipc-contracts-skills';
import { workItemReadinessSchema } from '@symphony/ipc-contracts-workflow';

// #endregion

export const snapshotSchema = z.object({
  health: runtimeHealthSchema,
  workItems: z.array(workItemSchema).readonly(),
  projectFields: z.array(projectFieldDefinitionSchema).readonly().optional().default([]),
  boardColumns: z.array(boardColumnSchema).readonly(),
  executions: z.array(executionRecordSchema).readonly(),
  deliveryGroups: z.array(deliveryGroupSchema).readonly().optional().default([]),
  deliveryGroupProposals: z.array(deliveryGroupProposalSchema).readonly().optional().default([]),
  executionQueue: z.array(executionQueueEntrySchema).readonly().optional().default([]),
  goals: z.array(goalRecordSchema).readonly().optional().default([]),
  pullRequests: z.array(pullRequestSummarySchema).readonly().optional().default([]),
  ciRuns: z.array(ciRunSchema).readonly().optional().default([]),
  ciWorkflows: z.array(ciWorkflowSchema).readonly().optional().default([]),
  localCiExecutions: z.array(localCiExecutionSchema).readonly().optional().default([]),
  events: z.array(executionEventSchema).readonly(),
  workflow: workflowDefinitionSchema,
  /**
   * What the stage guards would find per work item. The board decides what a person still owes
   * an item from the same evidence the guards read, so a card can never look ready for a step
   * the guards would refuse. Empty on a composition without a workflow record store.
   */
  workItemReadiness: z.array(workItemReadinessSchema).readonly().optional().default([]),
  skills: z.array(skillManifestSchema).readonly(),
  remoteData: z
    .object({
      workItems: remoteDataStatusSchema,
      pullRequests: remoteDataStatusSchema.optional(),
      ciRuns: remoteDataStatusSchema.optional(),
    })
    .optional(),
});
