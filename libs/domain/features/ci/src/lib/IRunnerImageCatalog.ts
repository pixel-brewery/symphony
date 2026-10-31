// #region Imports

import type { IRunnerImageCatalogEntry } from './IRunnerImageCatalogEntry';

// #endregion

export interface IRunnerImageCatalog {
  readonly entries: readonly IRunnerImageCatalogEntry[];
  readonly refreshedAt: string;
  /** Set when the cached catalog was served because the upstream refresh failed. */
  readonly staleReason?: string;
}
