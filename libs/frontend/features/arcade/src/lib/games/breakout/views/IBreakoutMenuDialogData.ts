// #region Imports

import type { IBreakoutSetup } from './IBreakoutSetup';

// #endregion

/** Current match and pending cartridge selection supplied to the Breakout menu dialog. @public */
export interface IBreakoutMenuDialogData {
  readonly canContinue: boolean;
  readonly setup: IBreakoutSetup;
}
