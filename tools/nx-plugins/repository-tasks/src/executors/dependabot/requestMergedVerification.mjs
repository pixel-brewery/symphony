// #region Imports

import { requestMergedWorkflow } from './requestMergedWorkflow.mjs';

// #endregion

/**
 * Requests the repository-owned verification continuation for an exact dependency merge.
 *
 * @param context - Trusted workflow event, repository identity and merged source.
 * @param dependencies - Optional request boundary for isolated verification.
 * @returns The source-bound requested, retained, unnecessary or superseded result.
 * @throws A controlled error when immutable source or workflow evidence is invalid.
 *
 * @internal
 */
export async function requestMergedVerification(context, dependencies = {}) {
  return requestMergedWorkflow('verification', context, dependencies);
}
