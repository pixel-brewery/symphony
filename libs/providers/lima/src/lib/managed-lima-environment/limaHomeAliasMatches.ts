// #region Imports

import { join } from 'node:path';
import { realpathSync } from 'node:fs';

// #endregion

export function limaHomeAliasMatches(alias: string, runtimeRoot: string): boolean {
  try {
    return realpathSync(alias) === realpathSync(join(runtimeRoot, 'lima'));
  } catch {
    // A missing alias, or one whose target is gone, belongs to no runtime root.
    return false;
  }
}
