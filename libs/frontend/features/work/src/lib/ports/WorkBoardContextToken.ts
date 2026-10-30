// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkBoardContext } from './IWorkBoardContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_BOARD_CONTEXT = new InjectionToken<IWorkBoardContext>('WORK_BOARD_CONTEXT');
