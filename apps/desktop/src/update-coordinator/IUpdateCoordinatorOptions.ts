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
  /**
   * Quits Symphony once a downloaded installer has been opened, so the installer can replace the
   * running application. The native updater quits on its own.
   */
  readonly quitApplication: () => void;
  readonly now?: () => Date;
}
