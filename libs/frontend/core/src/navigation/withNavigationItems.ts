// #region Imports

import { createFeature } from '../features/createFeature';
import type { IFeature } from '../features/IFeature';
import type { INavigationItem } from './INavigationItem';
import type { NavigationFeatureKind } from './NavigationFeatureKind';
import { NavigationFeatureKinds } from './NavigationFeatureKinds';
import { NAVIGATION_ITEMS } from './NavigationItems';

// #endregion

/**
 * Contributes feature-owned destinations to the existing navigation registry.
 *
 * @param options - Unique identifier and static destinations or a factory resolved in Angular DI.
 * @returns A typed contribution for the application navigation composition.
 * @public
 */
export function withNavigationItems(options: {
  readonly id: string;
  readonly items:
    | INavigationItem
    | readonly INavigationItem[]
    | (() => INavigationItem | readonly INavigationItem[]);
}): IFeature<NavigationFeatureKind> {
  const items = options.items;
  const providers =
    typeof items === 'function'
      ? [{ provide: NAVIGATION_ITEMS, useFactory: () => [items()].flat(), multi: true }]
      : [items].flat().map((item) => ({ provide: NAVIGATION_ITEMS, useValue: item, multi: true }));

  return createFeature(options.id, NavigationFeatureKinds.Item, providers, { multi: true });
}
