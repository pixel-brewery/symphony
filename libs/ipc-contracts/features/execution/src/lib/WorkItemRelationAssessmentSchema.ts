// #region Imports

import { z } from 'zod';

// #endregion

/** Zod contract for bounded Analyzer relationship evidence. */
export const workItemRelationAssessmentSchema = z.object({
  relation: z.enum(['duplicate', 'joint-delivery', 'dependency', 'collision', 'unrelated']),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly(),
  assessedRevisions: z.record(z.string().min(1), z.number().int().nonnegative()).readonly(),
  evidence: z.array(z.string().min(1).max(4_000)).max(100).readonly(),
  sharedChangeSurface: z.array(z.string().min(1).max(1_000)).max(100).readonly(),
  compatibleAcceptanceCriteria: z.boolean(),
  compatibleVerification: z.boolean(),
  hasOpenDecisions: z.boolean(),
  hasExistingClaims: z.boolean(),
  hasPullRequests: z.boolean(),
  assessedAt: z.string().min(1),
});
