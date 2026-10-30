// #region Imports

import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

/** Declares only the typed APIs supplied by the sandboxed desktop preload. */
declare global {
  interface Window {
    desktop: IDesktopApi;
    orchestration: IOrchestrationApi;
  }
}

export {};
