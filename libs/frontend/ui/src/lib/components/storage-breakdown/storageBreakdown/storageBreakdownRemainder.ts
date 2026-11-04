// #region Imports

import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import type { IStorageBreakdownRemainder } from './IStorageBreakdownRemainder';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
    get description() {
      return translateLabel(
        'loc.symphony.labels.space.left.before.the.gb.limit.stops.new.writes.d7d55e0',
        limitGiB,
      );
    },
  };
}
