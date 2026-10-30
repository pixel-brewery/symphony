// #region Imports

import type { IStorageSegment } from './IStorageSegment';
import type { StoragePressure } from './StoragePressure';

// #endregion

export interface IStorageUsage {
  readonly id: string;
  readonly label: string;
  readonly workspaceId?: string;
  readonly paths: readonly string[];
  readonly allocatedBytes: number;
  readonly limitBytes: number;
  readonly usagePercent: number;
  readonly pressure: StoragePressure;
  readonly segments: readonly IStorageSegment[];
}
