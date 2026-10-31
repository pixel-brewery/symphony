// #region Imports

import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';

// #endregion

const PARAMETER_KEY = /^[a-z][a-zA-Z-]{0,31}$/u;
const PARAMETER_VALUE = /^[A-Za-z0-9._~-]{1,200}$/u;

/**
 * Settings is a window of its own. A navigation to the main window's former `settings` route
 * opens that window at the requested location instead and leaves the main window where it is.
 *
 * @public
 */
export const openSettingsWindowGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const parameters = Object.fromEntries(
    Object.entries(route.queryParams)
      .filter(
        (entry): entry is [string, string] =>
          PARAMETER_KEY.test(entry[0]) &&
          typeof entry[1] === 'string' &&
          PARAMETER_VALUE.test(entry[1]),
      )
      .slice(0, 8),
  );
  void inject(DESKTOP_CLIENT).request(
    'settings.open',
    Object.keys(parameters).length ? { parameters } : {},
  );
  return router.navigated ? false : router.parseUrl('/main/home');
};
