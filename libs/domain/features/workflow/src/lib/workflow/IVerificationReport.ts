// #region Imports

import type { IVerificationFinding } from './IVerificationFinding';

// #endregion

/** Verification is always bound to one commit; a newer commit invalidates it. */
export interface IVerificationReport {
  readonly commitSha: string;
  readonly analysisRevision: string;
  readonly passed: boolean;
  readonly acceptanceEvidence: readonly {
    readonly acceptanceCriterion: string;
    readonly satisfied: boolean;
    readonly evidence: string;
  }[];
  readonly findings: readonly IVerificationFinding[];
  readonly unexpectedChanges: readonly string[];
  readonly continuousIntegrationPassed: boolean;
}
