// #region Imports

import type { Routes } from '@angular/router';
import { openSettingsWindowGuard } from './openSettingsWindowGuard';

// #endregion

/**
 * Main-window routes that lead to Settings: they open the Settings window and keep existing
 * bookmarks and deep links working.
 *
 * @public
 */
export const settingsRoutes: Routes = [
  { path: 'settings', canActivate: [openSettingsWindowGuard], children: [] },
  // Send former Projects bookmarks to the configuration surface that owns the same state.
  { path: 'projects', canActivate: [openSettingsWindowGuard], children: [] },
];
