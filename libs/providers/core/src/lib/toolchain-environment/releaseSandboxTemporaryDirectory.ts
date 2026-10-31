// #region Imports

import { dirname } from 'node:path';
import { rmSync } from 'node:fs';
import { shortTemporaryRoot } from './ShortTemporaryRoot';

// #endregion

/** Discards the temporary directory of a run that has finished. */
export function releaseSandboxTemporaryDirectory(directory: string): void {
  if (dirname(directory) !== shortTemporaryRoot()) return;
  rmSync(directory, { force: true, recursive: true });
}
