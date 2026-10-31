// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import { DELIVERY_ROUTE_HYDRATION } from '../ports/DeliveryRouteHydrationToken';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import type { IPaletteResult, ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import type { ISnapshotRouteStore } from '../view-presenters/routeHydration/ISnapshotRouteStore';
import type { IDeliverySearchContext } from './IDeliverySearchContext';
import { projectDeliveryPaletteResults } from './projectDeliveryPaletteResults';

// #endregion

/**
 * Owns pull-request field matching, contextual search and the command palette's pull requests and
 * `Sync now` for the Delivery feature.
 *
 * @public
 */
@Injectable()
export class DeliverySearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _context: IDeliverySearchContext;
  private readonly _sync: Pick<
    ISnapshotRouteStore,
    'refresh' | 'refreshContinuousIntegrationRuns'
  > | null;

  // #endregion

  // #region Ctor

  /**
   * Connects the existing read-only pull-request projection and the refreshes the pull-request
   * route already runs, which `Sync now` reuses.
   *
   * @public
   */
  public constructor(
    @Inject(DELIVERY_VIEW_CONTEXT)
    context: IDeliverySearchContext = inject(DELIVERY_VIEW_CONTEXT),
    @Inject(DELIVERY_ROUTE_HYDRATION)
    @Optional()
    sync: Pick<ISnapshotRouteStore, 'refresh' | 'refreshContinuousIntegrationRuns'> | null = null,
  ) {
    this._context = context;
    this._sync = sync;
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

  /**
   * Lists the matching pull requests, each opening the pull-request list narrowed to it, and
   * `Sync now`, which refreshes the pull requests and the Actions runs together.
   *
   * @param _query - Trimmed palette input; matching uses the normalized form.
   * @param normalizedQuery - Locale-lowercased palette input; empty lists only the command.
   * @returns Delivery's palette rows.
   * @public
   */
  public paletteResults(_query: string, normalizedQuery: string): readonly IPaletteResult[] {
    const snapshot = this._context.snapshot();
    const sync = this._sync;
    return projectDeliveryPaletteResults(
      snapshot?.pullRequests ?? [],
      snapshot?.ciRuns ?? [],
      normalizedQuery,
      sync
        ? // The snapshot goes first: refreshed in parallel it would replace the fresher CI runs.
          async () => {
            await sync.refresh();
            await sync.refreshContinuousIntegrationRuns();
          }
        : undefined,
    );
  }

  // #endregion
}
