// #region Imports

import { statfsSync } from 'node:fs';
import type { IManagedLimaStorageLimits } from './IManagedLimaStorageLimits';
import { allocatedPathBytes } from './allocatedPathBytes';

// #endregion

export function assertRuntimeStorage(limits: IManagedLimaStorageLimits): void {
  const allocatedBytes = allocatedPathBytes(limits.runtimeRoot);
  const limitBytes = limits.storageLimitGiB * 1024 ** 3;
  if (allocatedBytes >= limitBytes) {
    throw new Error(
      `Local CI storage safety stop: ${(allocatedBytes / 1024 ** 3).toFixed(1)} GB uses the ${limits.storageLimitGiB} GB limit.`,
    );
  }
  const filesystem = statfsSync(limits.runtimeRoot);
  const availableBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
  const reserveBytes = limits.minimumFreeDiskGiB * 1024 ** 3;
  if (availableBytes <= reserveBytes) {
    throw new Error(
      `Local CI storage safety stop: the Mac must keep ${limits.minimumFreeDiskGiB} GB free.`,
    );
  }
}
