// #region Imports

import type { ElectronApplication } from '@playwright/test';

// #endregion

/** Isolated process and output directories used by the real Arcade journeys. @public */
export interface IArcadeAppSession {
  readonly app: ElectronApplication;
  readonly configurationRoot: string;
  readonly outputDirectory: string;
}
