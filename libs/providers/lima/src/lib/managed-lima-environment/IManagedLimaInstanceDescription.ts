// #region Imports

import type { ManagedLimaInstancePurpose } from './ManagedLimaInstancePurpose';

// #endregion

/**
 * One managed instance that currently occupies disk. Reported even when Lima no longer tracks
 * it, because a failed teardown leaves the directory - and therefore the disk - behind while
 * `limactl list` stays silent about it.
 */
export interface IManagedLimaInstanceDescription {
  readonly name: string;
  readonly purpose: ManagedLimaInstancePurpose;
  /** Lima's own status, or `missing` when only the directory survived. */
  readonly status: 'running' | 'stopped' | 'unknown' | 'missing';
  readonly createdAt?: string;
  /** Disk size the instance was provisioned with, read from its own configuration. */
  readonly provisionedDiskGiB?: number;
}
