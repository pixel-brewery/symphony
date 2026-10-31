// #region Imports

import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';

// #endregion

declare global {
  interface Window {
    desktop: IDesktopApi;
    orchestration: IOrchestrationApi;
  }
}

export {};
