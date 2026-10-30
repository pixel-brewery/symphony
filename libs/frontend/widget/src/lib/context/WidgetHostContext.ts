// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWidgetHostContext } from './IWidgetHostContext';

// #endregion

/** The page-owned loading projection available to its mounted feature widgets. @public */
export const WIDGET_HOST_CONTEXT = new InjectionToken<IWidgetHostContext>('WIDGET_HOST_CONTEXT');
