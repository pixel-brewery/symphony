// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * The retired main-window Skills page. Skills live in the Settings window now; the former route
 * and its bookmarks open Settings at the `Skills` section.
 *
 * @public
 */
export const skillsRoutes: Routes = [
  { path: 'skills', pathMatch: 'full', redirectTo: '/main/settings?section=skills' },
];
