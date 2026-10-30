// #region Imports

import {
  type IResolvedLocalCiResourcePreset,
  type LocalCiResourcePresetName,
} from '@symphony/domain-ci';
import type { IStorageUsage } from './IStorageUsage';
import type { StoragePressure } from './StoragePressure';

// #endregion

export interface IStorageStatus {
  readonly measuredAt: string;
  /**
   * Whether the reported allocations come from a completed walk. A tree too large to measure
   * inline is counted in the background, and until that first pass finishes there is no
   * allocation to report - callers must show that state rather than present `0` as a fact.
   */
  readonly measured: boolean;
  readonly writable: boolean;
  readonly global: IStorageUsage;
  readonly localCi: IStorageUsage;
  readonly localCiCapacity: {
    readonly logicalCpus: number;
    readonly totalMemoryBytes: number;
    readonly availableStorageBytes: number;
    readonly presets: Readonly<Record<LocalCiResourcePresetName, IResolvedLocalCiResourcePreset>>;
  };
  readonly workspaces: readonly IStorageUsage[];
  readonly filesystem: {
    readonly availableBytes: number;
    readonly reserveBytes: number;
    readonly pressure: StoragePressure;
  };
  readonly error?: string;
}
