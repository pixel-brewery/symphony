// #region Imports

import type { IRunnerImageCatalogEntry } from './IRunnerImageCatalogEntry';

// #endregion

/** Human-readable label for one catalog entry. */
export function runnerImageDisplayName(entry: IRunnerImageCatalogEntry): string {
  return `Ubuntu ${entry.ubuntuVersion} · ${entry.architecture} · ${entry.imageVersion}`;
}
