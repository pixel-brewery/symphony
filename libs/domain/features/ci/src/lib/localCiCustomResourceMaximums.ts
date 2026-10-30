// #region Imports

import type { ILocalCiHostCapacity } from './ILocalCiHostCapacity';
import type { ILocalCiResourceLimits } from './ILocalCiResourceLimits';

// #endregion

export function localCiCustomResourceMaximums(
  resources: Pick<ILocalCiResourceLimits, 'diskGiB' | 'cacheGiB'>,
  capacity: ILocalCiHostCapacity,
): ILocalCiResourceLimits {
  const usableCpus = Math.max(0, Math.floor(capacity.logicalCpus) - 2);
  const hostMemoryReserveGiB = Math.max(4, Math.ceil(capacity.memoryGiB * 0.25));
  const usableMemoryGiB = Math.max(0, Math.floor(capacity.memoryGiB) - hostMemoryReserveGiB);
  const storageBudgetGiB = Math.max(
    0,
    Math.floor(Math.min(capacity.availableStorageGiB, capacity.storageLimitGiB)),
  );
  return {
    cpus: usableCpus,
    memoryGiB: usableMemoryGiB,
    diskGiB: Math.max(0, storageBudgetGiB - resources.cacheGiB - 2),
    cacheGiB: Math.max(0, storageBudgetGiB - resources.diskGiB - 2),
  };
}
