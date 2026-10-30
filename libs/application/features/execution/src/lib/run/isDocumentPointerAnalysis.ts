// #region Imports

import { MINIMUM_INLINE_ANALYSIS_CHARACTERS } from '../analyzer/MinimumInlineAnalysisCharacters';
import { documentReferencePattern } from '../analyzer/DocumentReferencePattern';

// #endregion

/**
 * Detects an analysis that points at a document instead of containing one.
 *
 * The managed workspace is disposed once the run finishes, so a plan the agent wrote to a file is
 * unreachable afterwards: the stored analysis would carry nothing the reviewer can read and
 * nothing the solver can implement. Failing the run keeps that visible instead of handing an
 * empty contract to the next step.
 */
export function isDocumentPointerAnalysis(analysis: string): boolean {
  const text = analysis.trim();
  return text.length < MINIMUM_INLINE_ANALYSIS_CHARACTERS && documentReferencePattern.test(text);
}
