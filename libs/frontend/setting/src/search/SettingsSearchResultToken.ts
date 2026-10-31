// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsSearchResult } from './ISettingsSearchResult';

// #endregion

/**
 * The search result an in-place control (`ISettingsSearchEntry.loadControl`) belongs to; its
 * `workspaceId` names the workspace of a workspace section.
 *
 * @public
 */
export const SETTINGS_SEARCH_RESULT = new InjectionToken<ISettingsSearchResult>(
  'SETTINGS_SEARCH_RESULT',
);
