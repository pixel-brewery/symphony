// #region Imports

import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { createHash } from 'node:crypto';

// #endregion

/**
 * Identity of the provisioned guest. A warm instance may only be reused while this value is
 * unchanged, so an edited setup script or a newly selected image forces a clean provision.
 */
export function guestFingerprint(image: IRunnerImageDefinition, setupScript?: string): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        releaseTag: image.releaseTag,
        architecture: image.architecture,
        cloudImageSha256: image.cloudImageSha256,
        aptPackages: [...image.aptPackages].sort(),
        nodeSha256: image.nodeSha256,
        environment: image.environment,
        setupScript: setupScript ?? '',
      }),
    )
    .digest('hex');
}
