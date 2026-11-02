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
  /**
   * The default local-CI storage admission decision, using the same bounded growth as a start.
   * Byte amounts are live filesystem evidence plus the current conservative growth budget.
   * A pending allocation inventory cannot establish quota availability; a live reserve block
   * is still conclusive. Shortfall is the extra free space needed to retain the Mac reserve.
   */
  readonly localCiAdmission:
    | {
        readonly state: 'permitted';
        readonly availableBytes: number;
        readonly reserveBytes: number;
        readonly requiredGrowthBytes: number;
        readonly shortfallBytes: 0;
      }
    | {
        readonly state: 'blocked';
        readonly reason:
          'filesystem-reserve' | 'managed-limit' | 'local-ci-limit' | 'workspace-limit';
        readonly availableBytes: number;
        readonly reserveBytes: number;
        readonly requiredGrowthBytes: number;
        readonly shortfallBytes: number;
        readonly workspaceId?: string;
      }
    | {
        readonly state: 'unknown';
        readonly reason: 'allocation-pending';
        readonly availableBytes: number;
        readonly reserveBytes: number;
        readonly requiredGrowthBytes: number;
        readonly shortfallBytes: 0;
      }
    | {
        readonly state: 'unknown';
        readonly reason: 'measurement-failed';
        readonly reserveBytes: number;
      };
  readonly workspaces: readonly IStorageUsage[];
  readonly filesystem: {
    readonly availableBytes: number;
    readonly reserveBytes: number;
    readonly pressure: StoragePressure;
  };
  readonly error?: string;
}
