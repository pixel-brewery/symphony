// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Settings opens inside the main window: the route renders the section content, and the screen
 * replaces the sidebar's destinations with the Settings navigation while it is open.
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
