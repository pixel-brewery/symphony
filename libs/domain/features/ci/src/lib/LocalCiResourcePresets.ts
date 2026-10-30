// #region Imports

import type { ILocalCiResourceLimits } from './ILocalCiResourceLimits';
import type { LocalCiResourcePresetName } from './LocalCiResourcePresetName';

// #endregion

export const localCiResourcePresets: Readonly<
  Record<LocalCiResourcePresetName, ILocalCiResourceLimits>
> = {
  compact: { cpus: 4, memoryGiB: 8, diskGiB: 12, cacheGiB: 4 },
  balanced: { cpus: 6, memoryGiB: 12, diskGiB: 20, cacheGiB: 8 },
  performance: { cpus: 8, memoryGiB: 16, diskGiB: 30, cacheGiB: 12 },
  custom: { cpus: 4, memoryGiB: 8, diskGiB: 12, cacheGiB: 4 },
};
