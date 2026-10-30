// #region Imports

import type { IAnalysisArtifact } from '../workflow/IAnalysisArtifact';
import type { IHumanDecision } from '../workflow/IHumanDecision';
import type { IPullRequestFacts } from '../workflow/IPullRequestFacts';
import type { IVerificationReport } from '../workflow/IVerificationReport';
import type { IWorkflowRecord } from '../workflow/IWorkflowRecord';

// #endregion

/**
 * Everything a guard may inspect. The facts are gathered once per evaluation so guards stay
 * pure predicates: same facts, same verdict, no I/O, no clock beyond the supplied instant.
 */
export interface IGuardFacts {
  readonly record: IWorkflowRecord;
  readonly now: Date;
  readonly decision?: IHumanDecision;
  readonly analysis?: IAnalysisArtifact;
  readonly verification?: IVerificationReport;
  readonly workItem: {
    readonly title: string;
    readonly body: string;
    readonly revision?: string;
    readonly closed: boolean;
    readonly duplicateOfId?: string;
  };
  readonly pullRequest?: IPullRequestFacts;
  readonly postMergeChecksPassed?: boolean;
  readonly dependenciesSatisfied: boolean;
  readonly collidingWorkItemIds: readonly string[];
  readonly capacityAvailable: boolean;
  readonly riskPolicySatisfied: boolean;
  readonly auditComplete: boolean;
  readonly owner: string;
  /** Fencing token the writing worker holds; must still match the record's claim. */
  readonly claimVersion?: number;
}
