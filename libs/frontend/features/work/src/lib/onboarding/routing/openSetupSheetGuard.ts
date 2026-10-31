// #region Imports

import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

// #endregion

/**
 * `Build your project team` is a sheet of the Settings window. The former `/main/setup` page
 * opens Settings with that sheet instead, through the main window's Settings route.
 *
 * @public
 */
export const openSetupSheetGuard: CanActivateFn = (route) => {
  const workspace = route.queryParamMap.get('workspace');
  return inject(Router).createUrlTree(['/main/settings'], {
    queryParams: { sheet: 'setup', ...(workspace ? { workspace } : {}) },
  });
};
