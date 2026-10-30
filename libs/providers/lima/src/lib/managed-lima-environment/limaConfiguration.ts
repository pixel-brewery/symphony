// #region Imports

import type { ILocalCiResourceLimits } from '@symphony/domain-ci';
import type { IRunnerImageDefinition } from '@symphony/domain-core';
import type { IManagedLimaMount } from './IManagedLimaMount';
import { LIMA_VERSION } from './LimaVersion';

// #endregion

export function limaConfiguration(
  image: IRunnerImageDefinition,
  resources: ILocalCiResourceLimits,
  mounts: readonly IManagedLimaMount[],
): string {
  const guestArchitecture = image.architecture === 'arm64' ? 'aarch64' : 'x86_64';
  const location = `https://cloud-images.ubuntu.com/releases/${image.ubuntuCodename}/release-${image.cloudImageRelease}/${image.cloudImageFile}`;
  return [
    `minimumLimaVersion: ${LIMA_VERSION}`,
    'vmType: vz',
    `arch: ${guestArchitecture}`,
    `cpus: ${resources.cpus}`,
    `memory: ${resources.memoryGiB}GiB`,
    `disk: ${resources.diskGiB}GiB`,
    'mountType: virtiofs',
    'mounts:',
    ...mounts.flatMap((mount) => [
      `  - location: ${JSON.stringify(mount.location)}`,
      `    mountPoint: ${mount.mountPoint}`,
      `    writable: ${mount.writable}`,
    ]),
    'containerd:',
    '  system: false',
    '  user: false',
    'images:',
    `  - location: ${location}`,
    `    arch: ${guestArchitecture}`,
    `    digest: sha256:${image.cloudImageSha256}`,
    '',
  ].join('\n');
}
