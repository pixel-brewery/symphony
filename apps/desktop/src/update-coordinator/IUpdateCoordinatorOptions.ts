// #region Imports

import { type UpdateChannel } from '@symphony/ipc-contracts-desktop';
import type { IAutoUpdateAdapter } from './IAutoUpdateAdapter';
import type { IInstallerUpdateAdapter } from './IInstallerUpdateAdapter';

// #endregion

export interface IUpdateCoordinatorOptions {
  readonly adapter: IAutoUpdateAdapter;
  readonly installerAdapter: IInstallerUpdateAdapter;
  readonly currentVersion: string;
  readonly channel: UpdateChannel;
  readonly updateBaseUrl: string;
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly packaged: boolean;
  readonly now?: () => Date;
}
