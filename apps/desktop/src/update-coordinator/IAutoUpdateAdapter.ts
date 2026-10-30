// #region Imports

import type { AutoUpdateEvent } from './AutoUpdateEvent';

// #endregion

export interface IAutoUpdateAdapter {
  configure(feed: { readonly url: string; readonly serverType?: 'json' }): void;
  subscribe(listener: (event: AutoUpdateEvent) => void): () => void;
  check(): Promise<void>;
  install(): void;
}
