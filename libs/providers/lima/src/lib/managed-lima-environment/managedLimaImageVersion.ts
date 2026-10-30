// #region Imports

import type { IRunnerImageDefinition } from '@symphony/domain-core';
import { LIMA_VERSION } from './LimaVersion';

// #endregion

/** Reproducible identity of the guest a run executed on. */
export function managedLimaImageVersion(image: IRunnerImageDefinition): string {
  return [
    `ubuntu-${image.ubuntuVersion}-${image.cloudImageRelease}@sha256:${image.cloudImageSha256}`,
    `lima-${LIMA_VERSION}`,
    `runner-image-${image.releaseTag.replace('/', '-')}`,
    `node-${image.nodeVersion}`,
  ].join('/');
}
