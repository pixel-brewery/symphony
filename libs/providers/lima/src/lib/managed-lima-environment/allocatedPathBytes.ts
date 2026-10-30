// #region Imports

import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// #endregion

export function allocatedPathBytes(path: string): number {
  if (!existsSync(path)) return 0;
  const visited = new Set<string>();
  const visit = (candidate: string): number => {
    const stat = lstatSync(candidate);
    if (stat.isSymbolicLink()) return 0;
    const identity = `${stat.dev}:${stat.ino}`;
    if (visited.has(identity)) return 0;
    visited.add(identity);
    let bytes = typeof stat.blocks === 'number' ? stat.blocks * 512 : stat.size;
    if (stat.isDirectory()) {
      for (const entry of readdirSync(candidate, { withFileTypes: true })) {
        bytes += visit(join(candidate, entry.name));
      }
    }
    return bytes;
  };
  return visit(path);
}
