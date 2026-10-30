// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkWidgetContext } from '../widgets/IWorkWidgetContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_WIDGET_CONTEXT = new InjectionToken<IWorkWidgetContext>('WORK_WIDGET_CONTEXT');
