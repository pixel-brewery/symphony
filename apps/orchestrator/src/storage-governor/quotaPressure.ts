// #region Imports

import type { StoragePressure } from './StoragePressure';

// #endregion

export function quotaPressure(allocatedBytes: number, limitBytes: number): StoragePressure {
  const ratio = allocatedBytes / Math.max(1, limitBytes);
  if (ratio >= 0.95) return 'critical';
  if (ratio >= 0.8) return 'danger';
  if (ratio >= 0.6) return 'warning';
  return 'healthy';
}
