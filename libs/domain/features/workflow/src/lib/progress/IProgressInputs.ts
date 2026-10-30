// #region Imports

import type { IWorkflowRevisions } from '../workflow/IWorkflowRevisions';
import type { ReasonCode } from '../workflow/ReasonCode';

// #endregion

/** Material inputs of a run. Two runs with the same fingerprint made no progress. */
export interface IProgressInputs {
  readonly revisions: IWorkflowRevisions;
  readonly reasonCode?: ReasonCode;
  readonly diffDigest?: string;
  readonly testResultDigest?: string;
  readonly dependencyDigest?: string;
  readonly externalStateDigest?: string;
}
