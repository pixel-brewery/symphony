// #region Imports

import type { ILocalCiResourceLimits } from '@symphony/domain-ci';

// #endregion

export function localCiSwapGiB(resources: ILocalCiResourceLimits): number {
  const memoryShortfallGiB = Math.max(0, 12 - resources.memoryGiB);
  const diskHeadroomGiB = Math.max(0, resources.diskGiB - 20);
  return Math.min(4, memoryShortfallGiB, diskHeadroomGiB);
}
