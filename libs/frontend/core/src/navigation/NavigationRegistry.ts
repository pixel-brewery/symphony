// #region Imports

import { computed, Inject, inject, Injectable, Optional, type Signal } from '@angular/core';
import type { INavigationItem } from './INavigationItem';
import { NAVIGATION_ITEMS } from './NavigationItems';

// #endregion

/**
 * Projects registered feature destinations for each navigation surface.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class NavigationRegistry {
  // #region Fields

  private readonly _items: readonly INavigationItem[];

  // #endregion

  // #region Ctor

  /**
   * Constructs a registry from the contributed navigation items.
   *
   * @param items - Multi-token destinations, or null when no feature contributes navigation.
   * @public
   */
  public constructor(
    @Inject(NAVIGATION_ITEMS)
    @Optional()
    items: readonly INavigationItem[] | null = inject(NAVIGATION_ITEMS, { optional: true }),
  ) {
    this._items = (items ?? []).flat();
  }

  // #endregion

  // #region Methods

  /**
   * Projects the visible destinations of one region in stable order.
   *
   * @param region - Navigation surface whose destinations should be projected.
   * @returns A signal that follows feature-owned visibility preferences.
   * @public
   */
  public byRegion(region: string): Signal<readonly INavigationItem[]> {
    return computed(() =>
      this._items
        .filter((item) => item.region === region && (item.isVisible?.() ?? true))
        .toSorted((left, right) => left.order - right.order || left.key.localeCompare(right.key)),
    );
  }

  // #endregion
}
