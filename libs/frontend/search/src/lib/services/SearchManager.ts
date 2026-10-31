// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import { Router } from '@angular/router';
import type { ISearchProvider } from '../models/ISearchProvider';
import { SEARCH_PROVIDERS } from '../provider/SearchProviders';

// #endregion

/**
 * Applies the established contextual, alias and feature-data search priority to navigation.
 *
 * @public
 */
@Injectable()
export class SearchManager {
  // #region Fields

  private readonly _router: Pick<Router, 'url' | 'navigate' | 'navigateByUrl'>;
  private readonly _providers: readonly ISearchProvider[];

  // #endregion

  // #region Ctor

  /**
   * Connects the router and the deliberately registered feature providers.
   *
   * @public
   */
  public constructor(
    @Inject(Router)
    router: Pick<Router, 'url' | 'navigate' | 'navigateByUrl'> = inject(Router),
    @Inject(SEARCH_PROVIDERS)
    @Optional()
    providers: readonly ISearchProvider[] | null = inject(SEARCH_PROVIDERS, { optional: true }),
  ) {
    this._router = router;
    this._providers = [...(providers ?? [])].sort((left, right) => left.order - right.order);
  }

  // #endregion

  // #region Methods

  /**
   * Runs the current route's contextual search before route aliases and feature data matches.
   *
   * @param query - Existing input or voice transcript, trimmed only for navigation.
   * @returns Completion of the selected route change, if a destination matches.
   * @public
   */
  public async search(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    const normalizedQuery = trimmedQuery.toLocaleLowerCase();
    const path = this._router.url.split('?')[0] ?? '';
    const contextual = this._providers.some((provider) => provider.contextualPaths?.includes(path));
    if (contextual) {
      await this._router.navigate([path], {
        queryParams: { q: trimmedQuery || null },
        queryParamsHandling: 'merge',
      });
      return;
    }
    if (!normalizedQuery) return;

    const alias = this._providers
      .flatMap((provider) => provider.aliases ?? [])
      .sort((left, right) => left.order - right.order)
      .find((candidate) => candidate.term.includes(normalizedQuery));
    if (alias) {
      await this._router.navigateByUrl(alias.path);
      return;
    }

    for (const provider of this._providers) {
      const match = provider.match?.(trimmedQuery, normalizedQuery);
      if (!match) continue;
      await this._router.navigate([match.path], { queryParams: match.queryParams });
      return;
    }
  }

  // #endregion
}
