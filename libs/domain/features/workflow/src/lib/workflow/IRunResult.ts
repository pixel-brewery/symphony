// #region Imports

import type { IAnalysisArtifact } from './IAnalysisArtifact';
import type { IHumanDecisionRequest } from './IHumanDecisionRequest';
import type { IPullRequestFacts } from './IPullRequestFacts';
import type { IRunEvidence } from './IRunEvidence';
import type { IVerificationReport } from './IVerificationReport';
import type { IWorkflowArtifactReference } from './IWorkflowArtifactReference';
import type { IWorkflowRevisions } from './IWorkflowRevisions';
import type { ProcessRole } from './ProcessRole';
import type { ReasonCode } from './ReasonCode';
import type { RunOutcome } from './RunOutcome';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/**
 * Structured result every role returns to the supervisor. A role reports; it never moves
 * the work item itself.
 */
export interface IRunResult {
  readonly runId: string;
  readonly role: ProcessRole;
  readonly outcome: RunOutcome;
  readonly reasonCode?: ReasonCode;
  /** Stage the role suggests. The supervisor decides using the workflow definition. */
  readonly recommendedStageId?: WorkflowStageId;
  readonly summary: string;
  readonly evidence: readonly IRunEvidence[];
  readonly revisions?: IWorkflowRevisions;
  readonly artifacts?: readonly IWorkflowArtifactReference[];
  /** Definition of Ready parsed from an analyze result; the supervisor stores it on the record. */
  readonly analysis?: IAnalysisArtifact;
  /** Pull-request facts proven by the reporting step; the acceptance-entry guards read them. */
  readonly pullRequest?: IPullRequestFacts;
  /** Commit-bound verification verdict backing a verify outcome. */
  readonly verification?: IVerificationReport;
  readonly humanRequest?: Omit<IHumanDecisionRequest, 'id' | 'raisedAt' | 'raisedByRole'>;
  readonly blockingWorkItemIds?: readonly string[];
  readonly finishedAt: string;
}
