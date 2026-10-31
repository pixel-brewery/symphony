// #region Imports

import { type IApplicationSettings } from '@symphony/configuration-composition';

// #endregion

export interface IStorageGovernorOptions {
  readonly configurationRoot: string;
  readonly browserDataRoot?: string;
  readonly settings: () => IApplicationSettings;
  readonly availableFilesystemBytes?: (path: string) => number;
  readonly availableParallelism?: () => number;
  readonly totalMemoryBytes?: () => number;
}
