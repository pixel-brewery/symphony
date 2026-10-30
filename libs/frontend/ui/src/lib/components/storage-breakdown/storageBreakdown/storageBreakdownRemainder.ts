// #region Imports

import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import type { IStorageBreakdownRemainder } from './IStorageBreakdownRemainder';

// #endregion

/** The unused part of the limit, described in the same terms as every measured share. */
export function storageBreakdownRemainder(
  usage: StorageUsageDto | undefined,
  measured: boolean,
  limitGiB: number,
): IStorageBreakdownRemainder | undefined {
  if (!usage || !measured) return undefined;
  return {
    allocatedBytes: Math.max(0, Math.round(limitGiB * 1024 ** 3) - usage.allocatedBytes),
    description: `Space left before the ${limitGiB} GB limit stops new writes.`,
  };
}
