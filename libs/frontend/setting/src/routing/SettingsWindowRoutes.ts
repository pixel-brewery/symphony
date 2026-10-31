// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * The Settings window's own top-level route, loaded by the separate Settings `BrowserWindow`.
 *
 * @public
 */
export const settingsWindowRoutes: Routes = [
  {
    path: 'settings',
    loadComponent: () =>
      import('../views/SettingsWindowView').then((module) => module.SettingsWindowView),
  },
];
