// #region Imports

import type { StorageSegmentVariant } from './StorageSegmentVariant';

// #endregion

export interface IStorageBreakdownEntry {
  readonly id: string;
  readonly segmentItemId: string;
  readonly label: string;
  readonly description: string;
  readonly allocatedBytes: number;
  readonly variant: StorageSegmentVariant;
}
