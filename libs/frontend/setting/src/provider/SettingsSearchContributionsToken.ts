// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsSearchContribution } from '../search/ISettingsSearchContribution';

// #endregion

/**
 * Collects the data-dependent `Search settings` entries features add to other features' sections.
 *
 * @public
 */
export const SETTINGS_SEARCH_CONTRIBUTIONS = new InjectionToken<
  readonly ISettingsSearchContribution[]
>('SETTINGS_SEARCH_CONTRIBUTIONS');
