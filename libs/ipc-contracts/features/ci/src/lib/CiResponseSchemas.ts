// #region Imports

import { z } from 'zod';
import { runnerImageDefinitionSchema } from '@symphony/configuration-ci';
import { ciRunDetailsSchema } from './CiRunDetailsSchema';
import { ciRunHistorySchema } from './CiRunHistorySchema';
import { ciRunLogChunkSchema } from './CiRunLogChunkSchema';
import { ciRunSchema } from './CiRunSchema';
import { ciWorkflowSchema } from './CiWorkflowSchema';
import { continuousIntegrationUsageReportSchema } from './ContinuousIntegrationUsageReportSchema';
import { localCiExecutionSchema } from './LocalCiExecutionSchema';
import { localCiInstanceSchema } from './LocalCiInstanceSchema';
import { remoteDataStatusSchema } from '@symphony/ipc-contracts-core';
import { runnerImageCatalogEntrySchema } from './RunnerImageCatalogEntrySchema';
import { verificationPlanSchema } from './VerificationPlanSchema';
import { verificationRunSchema } from './VerificationRunSchema';

// #endregion

/**
 * Owns the validated ci response payloads at the desktop boundary.
 *
 * @public
 */
export const ciResponseSchemas = {
  'verification.plan': verificationPlanSchema,
  'verification.run': verificationRunSchema,
  'verification.cancel': z.object({ completed: z.literal(true) }),
  'ci.usage.get': z.array(continuousIntegrationUsageReportSchema).readonly(),
  'ci.runs.refresh': z.object({
    ciWorkflows: z.array(ciWorkflowSchema).readonly(),
    ciRuns: z.array(ciRunSchema).readonly(),
    localCiExecutions: z.array(localCiExecutionSchema).readonly(),
    activeLocalCiRun: z
      .object({
        runId: z.string().min(1),
        startedAt: z.iso.datetime(),
      })
      .optional(),
    remoteData: remoteDataStatusSchema,
  }),
  'ci.runs.history.list': ciRunHistorySchema,
  'ci.workflow.dispatch': ciRunSchema,
  'ci.workflow.local.run': localCiExecutionSchema,
  'ci.approval.review': z.object({ completed: z.literal(true) }),
  'ci.run.details': ciRunDetailsSchema,
  'ci.run.log': ciRunLogChunkSchema,
  'ci.cancel': z.object({ completed: z.literal(true) }),
  'ci.rerun': z.object({ completed: z.literal(true) }),
  'ci.local.run': localCiExecutionSchema,
  'ci.local.cancel': z.object({ completed: z.literal(true) }),
  'local-ci.images.list': z.object({
    architecture: z.enum(['arm64', 'x64']),
    entries: z.array(runnerImageCatalogEntrySchema).readonly(),
    refreshedAt: z.iso.datetime(),
    staleReason: z.string().max(1_000).optional(),
    selections: z
      .array(
        z.object({
          workspaceId: z.string().min(1),
          image: runnerImageDefinitionSchema.optional(),
        }),
      )
      .readonly(),
  }),
  'local-ci.image.select': z.object({
    workspaceId: z.string().min(1),
    image: runnerImageDefinitionSchema,
  }),
  'local-ci.instances.list': z.object({
    runtimeRoot: z.string().min(1),
    instances: z.array(localCiInstanceSchema).readonly(),
  }),
  'local-ci.instances.remove': z.object({
    removed: z.boolean(),
    instances: z.array(localCiInstanceSchema).readonly(),
  }),
  'ci.local.cleanup': z.object({
    removedInstances: z.number().int().nonnegative(),
    removedConfigurationFiles: z.number().int().nonnegative(),
    cacheCleared: z.boolean(),
  }),
} as const;
