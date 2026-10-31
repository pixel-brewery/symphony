// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiUsageContext } from './ICiUsageContext';

// #endregion

/** The authoritative scope and configured repositories consumed by CI usage queries. @public */
export const CI_USAGE_CONTEXT = new InjectionToken<ICiUsageContext>('CI_USAGE_CONTEXT');
