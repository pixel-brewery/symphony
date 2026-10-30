// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import type { ICiContext } from '../ports/ICiContext';
import { CI_CONTEXT } from '../ports/CiContextToken';

// #endregion

/**
 * Uses CI's existing run projection for global and contextual Actions search.
 *
 * @public
 */
@Injectable()
export class CiSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _context: Pick<ICiContext, 'runs'>;

  // #endregion

  // #region Ctor

  /** Connects the feature's existing run projection. @public */
  public constructor(@Inject(CI_CONTEXT) context: Pick<ICiContext, 'runs'> = inject(CI_CONTEXT)) {
    this._context = context;
  }

  // #endregion

  // #region Properties

  /** Stable CI search provider identity. @public @readonly */
  public readonly id = 'ci.search';
  /** CI follows Work and Delivery matches. @public @readonly */
  public readonly order = 30;
  /** Actions searches retain the current route query. @public @readonly */
  public readonly contextualPaths = ['/main/actions'];
  /** Existing global Actions route phrase. @public @readonly */
  public readonly aliases = [{ term: 'actions', path: '/main/actions', order: 5 }];

  // #endregion

  // #region Methods

  /**
   * Matches the run fields already covered by the global search.
   *
   * @param query - Trimmed input retained for the target route's query.
   * @param normalizedQuery - Locale-normalized field search input.
   * @returns The Actions destination when a run matches.
   * @public
   */
  public match(query: string, normalizedQuery: string): ISearchMatch | undefined {
    const actionMatch = this._context
      .runs()
      .some((run) =>
        [
          run.name,
          run.title,
          run.actor,
          run.event,
          run.branch,
          run.revision,
          run.status,
          run.runNumber,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );
    return actionMatch ? { path: '/main/actions', queryParams: { q: query } } : undefined;
  }

  // #endregion
}
