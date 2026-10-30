// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import { Router } from '@angular/router';
import type { IQuickCreateItem } from '../models/IQuickCreateItem';
import type { IQuickCreateItemSource } from '../models/IQuickCreateItemSource';
import { QUICK_CREATE_SOURCES } from '../provider/QuickCreateSources';

// #endregion

/**
 * Resolves current feature authoring actions and sends their existing one-shot route intent.
 *
 * @public
 */
@Injectable()
export class QuickCreateManager {
  // #region Fields

  private readonly _router: Pick<Router, 'navigate'>;
  private readonly _sources: readonly IQuickCreateItemSource[];

  // #endregion

  // #region Ctor

  /** Connects the existing router and optional feature contributions. @public */
  public constructor(
    @Inject(Router) router: Pick<Router, 'navigate'> = inject(Router),
    @Inject(QUICK_CREATE_SOURCES)
    @Optional()
    sources: readonly IQuickCreateItemSource[] | null = inject(QUICK_CREATE_SOURCES, {
      optional: true,
    }),
  ) {
    this._router = router;
    this._sources = sources ?? [];
  }

  // #endregion

  // #region Properties

  /** Current actions, including disabled actions that explain their unavailable state. @public @readonly */
  public get items(): readonly IQuickCreateItem[] {
    const items = this._sources.flatMap((source) => source.getItems());
    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.id)) throw new Error(`Duplicate quick-create item id: "${item.id}".`);
      ids.add(item.id);
    }
    return items;
  }

  // #endregion

  // #region Methods

  /**
   * Resolves the authoring action for its owning navigation category.
   *
   * @param navigationItemKey - Feature-owned category identifier.
   * @returns Its current action, or undefined when the feature did not contribute one.
   * @public
   */
  public getItemForNavigation(navigationItemKey: string): IQuickCreateItem | undefined {
    const items = this.items.filter((item) => item.navigationItemKey === navigationItemKey);
    if (items.length > 1)
      throw new Error(`Duplicate quick-create navigation registration: "${navigationItemKey}".`);
    return items[0];
  }

  /**
   * Opens the owning route with the existing authoring surface intent.
   *
   * @param route - Route supplied by the feature-owned action.
   * @public
   */
  public async create(route: string): Promise<void> {
    await this._router.navigate([route], { queryParams: { create: 'true' } });
  }

  // #endregion
}
