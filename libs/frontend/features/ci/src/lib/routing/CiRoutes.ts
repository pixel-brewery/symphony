// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Lazy routes owned by the CI feature, preserving existing Actions bookmarks.
 *
 * @public
 */
export const ciRoutes: Routes = [
  {
    path: 'actions',
    loadComponent: () =>
      import('../actions/views/ActionsView').then((module) => module.ActionsView),
  },
];
