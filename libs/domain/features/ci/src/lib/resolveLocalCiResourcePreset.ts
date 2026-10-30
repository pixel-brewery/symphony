// #region Imports

import type { ILocalCiHostCapacity } from './ILocalCiHostCapacity';
import type { ILocalCiResourceLimits } from './ILocalCiResourceLimits';
import type { IResolvedLocalCiResourcePreset } from './IResolvedLocalCiResourcePreset';
import type { LocalCiResourcePresetName } from './LocalCiResourcePresetName';
import { localCiCustomResourceMaximums } from './localCiCustomResourceMaximums';
import { localCiResourceMinimums } from './LocalCiResourceMinimums';
import { localCiResourcePresets } from './LocalCiResourcePresets';

// #endregion

export function resolveLocalCiResourcePreset(
  preset: LocalCiResourcePresetName,
  capacity: ILocalCiHostCapacity,
  customResources?: ILocalCiResourceLimits,
): IResolvedLocalCiResourcePreset {
  const ceiling =
    preset === 'custom'
      ? (customResources ?? localCiResourcePresets.custom)
      : localCiResourcePresets[preset];
  const maximums = localCiCustomResourceMaximums(ceiling, capacity);
  const usableCpus = maximums.cpus;
  const usableMemoryGiB = maximums.memoryGiB;
  const storageBudgetGiB = Math.max(
    0,
    Math.floor(Math.min(capacity.availableStorageGiB, capacity.storageLimitGiB)),
  );
  const cacheGiB = Math.min(ceiling.cacheGiB, Math.max(1, Math.floor(storageBudgetGiB * 0.25)));
  const resources =
    preset === 'custom'
      ? ceiling
      : {
          cpus: Math.min(ceiling.cpus, usableCpus),
          memoryGiB: Math.min(ceiling.memoryGiB, usableMemoryGiB),
          diskGiB: Math.min(ceiling.diskGiB, Math.max(0, storageBudgetGiB - cacheGiB - 2)),
          cacheGiB,
        };
  const unavailableReason =
    preset === 'custom' && !customResources
      ? 'Choose the Custom profile in Settings and configure its resources before starting.'
      : resources.cpus < 2
        ? 'This Mac cannot reserve two CPUs for Symphony and still provide two CPUs to the VM.'
        : resources.cpus > usableCpus
          ? `The Custom CPU limit exceeds the ${usableCpus} CPUs currently available to the VM.`
          : resources.memoryGiB < localCiResourceMinimums.memoryGiB
            ? `This Mac cannot keep its memory reserve and still provide ${localCiResourceMinimums.memoryGiB} GB to the VM.`
            : resources.memoryGiB > usableMemoryGiB
              ? `The Custom memory limit exceeds the ${usableMemoryGiB} GB currently available to the VM.`
              : resources.diskGiB < 8
                ? 'The Local GitHub Actions storage limit or free-space reserve leaves less than 8 GB for the VM.'
                : resources.cacheGiB < 1
                  ? 'The Custom cache limit must provide at least 1 GB.'
                  : resources.diskGiB + resources.cacheGiB + 2 > storageBudgetGiB
                    ? `The Custom disk and cache limits exceed the ${storageBudgetGiB} GB Local GitHub Actions storage budget.`
                    : undefined;
  return {
    resources,
    supported: unavailableReason === undefined,
    ...(unavailableReason ? { unavailableReason } : {}),
  };
}
