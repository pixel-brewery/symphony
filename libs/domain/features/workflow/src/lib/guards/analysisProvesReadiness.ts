// #region Imports

import type { IAnalysisArtifact } from '../workflow/IAnalysisArtifact';

// #endregion

/**
 * Whether a stored analysis vouches that implementation may begin.
 *
 * The guard and the reconciliation that escalates an analysis-gated stage must agree on what
 * counts as proven, so both ask this predicate instead of each reading the flag themselves.
 */
export function analysisProvesReadiness(analysis: IAnalysisArtifact | undefined): boolean {
  return analysis?.readyForSolve === true;
}
