// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiActionContext } from './ICiActionContext';

// #endregion

/** Connects the CI Action drawer to its readonly transport facts. @public */
export const CI_ACTION_CONTEXT = new InjectionToken<ICiActionContext>('CI_ACTION_CONTEXT');
