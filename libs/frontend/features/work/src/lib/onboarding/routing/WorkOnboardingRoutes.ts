// #region Imports

import type { Routes } from '@angular/router';
import { openSetupSheetGuard } from './openSetupSheetGuard';

// #endregion

/**
 * Work-owned setup route preserving the existing project onboarding bookmark: it opens the
 * `Build your project team` sheet in the Settings window.
 *
 * @public
 */
export const workOnboardingRoutes: Routes = [
  { path: 'setup', canActivate: [openSetupSheetGuard], children: [] },
];
