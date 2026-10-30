// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Exposes the generic settings host and preserves existing Projects bookmarks.
 *
 * @public
 */
export const settingsRoutes: Routes = [
  {
    path: 'settings',
    loadComponent: () => import('../views/SettingsView').then((module) => module.SettingsView),
  },
  // Send former Projects bookmarks to the configuration surface that owns the same state.
  { path: 'projects', pathMatch: 'full', redirectTo: 'settings' },
];
