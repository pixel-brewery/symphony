// #region Imports

import type { ILocalCiResourceLimits } from './ILocalCiResourceLimits';

// #endregion

export interface IResolvedLocalCiResourcePreset {
  readonly resources: ILocalCiResourceLimits;
  readonly supported: boolean;
  readonly unavailableReason?: string;
}
