// #region Imports

import type { IGitHubStatusEntry } from './IGitHubStatusEntry';

// #endregion

export interface IGitHubStatusDocument {
  readonly hosts?: Record<string, readonly IGitHubStatusEntry[]>;
}
