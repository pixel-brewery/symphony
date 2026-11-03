// #region Imports

import type { ILocalCiResourceLimits } from './ILocalCiResourceLimits';

// #endregion

export const localCiResourceMinimums: Readonly<ILocalCiResourceLimits> = {
  cpus: 2,
  memoryGiB: 4,
  diskGiB: 8,
  cacheGiB: 1,
};
