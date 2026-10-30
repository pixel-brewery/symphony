// #region Imports

import type { IPowerSaveBlocker } from './IPowerSaveBlocker';

// #endregion

export interface IKeepAwakeCoordinatorOptions {
  readonly blocker: IPowerSaveBlocker;
  readonly enabled: boolean;
  readonly persist: (enabled: boolean) => void;
}
