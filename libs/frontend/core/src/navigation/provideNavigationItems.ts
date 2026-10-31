// #region Imports

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import type { INavigationItem } from './INavigationItem';
import { NAVIGATION_ITEMS } from './NavigationItems';

// #endregion

export function provideNavigationItems(
  items: INavigationItem | readonly INavigationItem[],
): EnvironmentProviders {
  return makeEnvironmentProviders(
    (Array.isArray(items) ? items : [items]).map((item) => ({
      provide: NAVIGATION_ITEMS,
      useValue: item,
      multi: true,
    })),
  );
}
