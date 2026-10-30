// #region Imports

import type { StoragePressure } from './StoragePressure';

// #endregion

export function maximumPressure(
  left: StoragePressure,
  right: StoragePressure | undefined,
): StoragePressure {
  if (!right) return left;
  const order: readonly StoragePressure[] = ['healthy', 'warning', 'danger', 'critical'];
  return order.indexOf(left) >= order.indexOf(right) ? left : right;
}
