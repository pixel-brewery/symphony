// #region Imports

import type { RunnerImageArchitecture } from '@symphony/domain-core';

// #endregion

/** Node.js distribution archive name for a version and architecture. */
export function nodeDistributionArchive(
  version: string,
  architecture: RunnerImageArchitecture,
): string {
  return `node-v${version}-linux-${architecture === 'arm64' ? 'arm64' : 'x64'}.tar.xz`;
}
