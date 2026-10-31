// #region Imports

import type { WorkItemRelationKind } from './WorkItemRelationKind';

// #endregion

/** Read-only, evidence-backed Analyzer result. A numeric confidence is deliberately absent. */
export interface IWorkItemRelationAssessment {
  relation: WorkItemRelationKind;
  workItemIds: readonly string[];
  assessedRevisions: Readonly<Record<string, number>>;
  evidence: readonly string[];
  sharedChangeSurface: readonly string[];
  compatibleAcceptanceCriteria: boolean;
  compatibleVerification: boolean;
  hasOpenDecisions: boolean;
  hasExistingClaims: boolean;
  hasPullRequests: boolean;
  assessedAt: string;
}
