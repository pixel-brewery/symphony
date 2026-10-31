// #region Imports

import { createHash } from 'node:crypto';
import type { IProgressInputs } from '@symphony/domain-workflow';

// #endregion

/**
 * Stable hash over everything that must change between two attempts for the work to count
 * as progressing. Equal fingerprints across attempts indicate a ping-pong loop, which the
 * supervisor escalates instead of retrying.
 */
export function computeProgressFingerprint(inputs: IProgressInputs): string {
  const material = [
    inputs.revisions.issueRevision ?? '',
    inputs.revisions.analysisRevision ?? '',
    inputs.revisions.repositoryBaseRevision ?? '',
    inputs.revisions.currentCommitSha ?? '',
    inputs.reasonCode ?? '',
    inputs.diffDigest ?? '',
    inputs.testResultDigest ?? '',
    inputs.dependencyDigest ?? '',
    inputs.externalStateDigest ?? '',
  ].join('\u0000');
  return createHash('sha256').update(material).digest('hex');
}
