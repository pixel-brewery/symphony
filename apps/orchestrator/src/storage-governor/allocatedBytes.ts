// #region Imports

import { type Stats } from 'node:fs';

// #endregion

export function allocatedBytes(stat: Stats): number {
  return typeof stat.blocks === 'number' && stat.blocks >= 0 ? stat.blocks * 512 : stat.size;
}
