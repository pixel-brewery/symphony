// #region Imports

import { dirname, resolve } from 'node:path';
import { existsSync, statfsSync } from 'node:fs';

// #endregion

export function availableFilesystemBytes(path: string): number {
  let candidate = resolve(path);
  while (!existsSync(candidate)) {
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error(`No existing filesystem found for ${path}.`);
    candidate = parent;
  }
  const stat = statfsSync(candidate);
  return Number(stat.bavail) * Number(stat.bsize);
}
