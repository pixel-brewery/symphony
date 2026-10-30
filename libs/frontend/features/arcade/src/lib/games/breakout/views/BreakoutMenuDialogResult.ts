// #region Imports

import type { IBreakoutSetup } from './IBreakoutSetup';

// #endregion

/** User decision returned by the Breakout menu dialog. @public */
export type BreakoutMenuDialogResult =
  | { readonly action: 'allGames' }
  | { readonly action: 'continue' }
  | { readonly action: 'play'; readonly setup: IBreakoutSetup };
