// #region Imports

import { InjectionToken } from '@angular/core';
import type { IViewPresenter } from './IViewPresenter';

// #endregion

/**
 * Injection token a View uses to expose its presenter to the template.
 *
 * @public
 */
export const VIEW_PRESENTER = new InjectionToken<IViewPresenter>('SYMPHONY_VIEW_PRESENTER');
