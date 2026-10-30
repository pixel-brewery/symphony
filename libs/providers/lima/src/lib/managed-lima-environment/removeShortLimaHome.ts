// #region Imports

import { rmSync } from 'node:fs';
import { limaHomeAliasMatches } from './limaHomeAliasMatches';

// #endregion

export function removeShortLimaHome(runtimeRoot: string, alias: string): void {
  if (!limaHomeAliasMatches(alias, runtimeRoot)) return;
  try {
    rmSync(alias, { force: true });
  } catch {
    // The short alias has already been removed.
  }
}
