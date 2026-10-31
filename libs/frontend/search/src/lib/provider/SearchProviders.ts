// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISearchProvider } from '../models/ISearchProvider';

// #endregion

/**
 * Collects the registered feature-owned search providers.
 *
 * @public
 */
export const SEARCH_PROVIDERS = new InjectionToken<readonly ISearchProvider[]>('SEARCH_PROVIDERS');
