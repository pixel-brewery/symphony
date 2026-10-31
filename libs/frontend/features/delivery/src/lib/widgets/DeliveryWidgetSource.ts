// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import { resolvePullRequestRun } from '@symphony/frontend-core';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import {
  PULL_REQUEST_STATES,
  pullRequestStateLabel,
  pullRequestStateOf,
  type PullRequestState,
} from '@symphony/frontend-core/delivery';
import { liveTile, type IWidgetTile } from '@symphony/frontend-widget';
import type { IDeliveryWidgetContext } from './IDeliveryWidgetContext';

// #endregion

const PULL_REQUESTS_ROUTE = '/main/pull-requests';

/** Owns the unchanged pull-request state category and its associated CI progress. @public */
@Injectable({ providedIn: 'root' })
export class DeliveryWidgetSource {
  // #region Fields
  private readonly _store: IDeliveryWidgetContext;
  private readonly _pullRequestTiles = computed<readonly IWidgetTile[]>(() => {
    const snapshot = this._store.snapshot();
    if (!snapshot) return [];
    const pullRequests = snapshot.pullRequests ?? [];
    if (!pullRequests.length) return [];
    const runs = snapshot.ciRuns ?? [];
    const counts = new Map<PullRequestState, number>();
    const running = new Map<PullRequestState, number>();
    for (const pullRequest of pullRequests) {
      const state = pullRequestStateOf(pullRequest);
      counts.set(state, (counts.get(state) ?? 0) + 1);
      if (resolvePullRequestRun(pullRequest, runs)?.status === 'in-progress') {
        running.set(state, (running.get(state) ?? 0) + 1);
      }
    }
    return PULL_REQUEST_STATES.map((state) => {
      const label = pullRequestStateLabel(state);
      return liveTile({
        id: state,
        testId: `home-pull-request-widget-${state}`,
        label,
        count: counts.get(state) ?? 0,
        route: PULL_REQUESTS_ROUTE,
        queryParams: { state },
        ariaLabel: `Open the pull requests filtered to ${label}`,
        liveCount: running.get(state) ?? 0,
      });
    });
  });
  // #endregion
  // #region Ctor
  /** Connects the existing pull-request and CI summary projection. @public */
  public constructor(
    @Inject(DELIVERY_VIEW_CONTEXT) context: IDeliveryWidgetContext = inject(DELIVERY_VIEW_CONTEXT),
  ) {
    this._store = context;
  }
  // #endregion
  // #region Properties
  /** Current pull-request tiles from their authoritative source. @public @readonly */
  public get tiles(): Signal<readonly IWidgetTile[]> {
    return this._pullRequestTiles;
  }
  // #endregion
}
