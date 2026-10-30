// #region Imports

import type { RunnerImageArchitecture } from '@symphony/domain-core';

// #endregion

/** Cloud-image file name Ubuntu publishes for a release and architecture. */
export function ubuntuCloudImageFile(
  version: string,
  architecture: RunnerImageArchitecture,
): string {
  return `ubuntu-${version}-server-cloudimg-${architecture === 'arm64' ? 'arm64' : 'amd64'}.img`;
}
