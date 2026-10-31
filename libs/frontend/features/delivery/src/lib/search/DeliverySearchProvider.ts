// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import type { ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import type { IDeliverySearchContext } from './IDeliverySearchContext';

// #endregion

/**
 * Owns pull-request field matching and contextual search for the Delivery feature.
 *
 * @public
 */
@Injectable()
export class DeliverySearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _context: IDeliverySearchContext;

  // #endregion

  // #region Ctor

  /** Connects the existing read-only pull-request projection. @public */
  public constructor(
    @Inject(DELIVERY_VIEW_CONTEXT)
    context: IDeliverySearchContext = inject(DELIVERY_VIEW_CONTEXT),
  ) {
    this._context = context;
  }

  // #endregion

  // #region Properties

  /** Stable Delivery search provider identity. @public @readonly */
  public readonly id = 'delivery.search';
  /** Pull requests follow matching work items. @public @readonly */
  public readonly order = 20;
  /** Pull-request searches retain selection and other route parameters. @public @readonly */
  public readonly contextualPaths = ['/main/pull-requests'];
  /** Existing global pull-request route phrase. @public @readonly */
  public readonly aliases = [{ term: 'pull requests', path: '/main/pull-requests', order: 4 }];

  // #endregion

  // #region Methods

  /**
   * Matches the existing pull-request summary fields.
   *
   * @param query - Trimmed input retained for the target route's query.
   * @param normalizedQuery - Locale-normalized field search input.
   * @returns The pull-request destination when one summary matches.
   * @public
   */
  public match(query: string, normalizedQuery: string): ISearchMatch | undefined {
    const pullRequestMatch = this._context
      .snapshot()
      ?.pullRequests?.some((pullRequest) =>
        [
          pullRequest.number,
          pullRequest.title,
          pullRequest.author,
          pullRequest.sourceBranch,
          pullRequest.targetBranch,
          pullRequest.state,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );
    return pullRequestMatch
      ? { path: '/main/pull-requests', queryParams: { q: query } }
      : undefined;
  }

  // #endregion
}
