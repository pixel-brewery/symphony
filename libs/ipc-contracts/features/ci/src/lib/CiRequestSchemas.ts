// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated ci request payloads at the desktop boundary.
 *
 * @public
 */
export const ciRequestSchemas = {
  'verification.plan': z.object({ repositoryBindingId: z.string().min(1) }),
  'verification.run': z.object({
    repositoryBindingId: z.string().min(1),
    planId: z.string().min(1),
    approval: z.enum(['once', 'repository', 'stored']),
  }),
  'verification.cancel': z.object({ repositoryBindingId: z.string().min(1) }),
  'ci.usage.get': z.object({
    repositoryBindingIds: z.array(z.string().min(1)).min(1).max(100).readonly(),
  }),
  'ci.runs.refresh': z.object({ includeWorkflowCatalog: z.boolean().optional() }),
  'ci.runs.history.list': z.object({
    /** One configured workspace; every workspace of the active scope when omitted. */
    workspaceId: z.string().min(1).optional(),
    /** Earliest run start of interest. */
    since: z.iso.datetime({ offset: true }),
  }),
  'ci.workflow.dispatch': z.object({
    inputs: z.record(z.string(), z.string()).optional(),
    workflowId: z.string().min(1),
    ref: z.string().min(1).max(255),
  }),
  'ci.workflow.local.run': z.object({
    workflowId: z.string().min(1),
    ref: z.string().min(1).max(255),
  }),
  'ci.approval.review': z.object({
    runId: z.string().min(1),
    revision: z.string().min(1),
    environmentIds: z.array(z.number().int().positive()).min(1).max(100),
    decision: z.enum(['approved', 'rejected']),
    comment: z.string().trim().min(1).max(4000),
  }),
  'ci.run.details': z.object({ runId: z.string().min(1) }),
  'ci.run.log': z.object({
    runId: z.string().min(1),
    kind: z.enum(['output', 'failure']),
    offset: z.number().int().nonnegative(),
  }),
  'ci.cancel': z.object({ runId: z.string().min(1) }),
  'ci.rerun': z.object({ runId: z.string().min(1) }),
  'ci.local.run': z.object({ runId: z.string().min(1) }),
  'ci.local.cancel': z.object({ runId: z.string().min(1) }),
  'ci.local.cleanup': z.object({}),
  'local-ci.images.list': z.object({ refresh: z.boolean().default(false) }),
  'local-ci.instances.list': z.object({}),
  'local-ci.instances.remove': z.object({ name: z.string().min(1).max(128) }),
  'local-ci.image.select': z.object({
    workspaceId: z.string().min(1),
    releaseTag: z
      .string()
      .min(1)
      .max(128)
      .regex(/^ubuntu\d{2}(?:-arm64)?\/\d{8}\.\d+$/u),
  }),
} as const;
