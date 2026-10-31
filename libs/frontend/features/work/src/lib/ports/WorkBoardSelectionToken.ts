// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkBoardSelection } from './IWorkBoardSelection';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_BOARD_SELECTION = new InjectionToken<IWorkBoardSelection | null>(
  'WORK_BOARD_SELECTION',
);
