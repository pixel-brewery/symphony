// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';
import {
  cachedRemoteDataStatus,
  failedRemoteDataStatus,
  isRemoteProjectionFresh,
  RemoteProjectionScopeChangedError,
} from '@symphony/application-core';
import type { IWorkItem, IWorkTrackingProjection } from '@symphony/domain-work';
import type { IWorkItemDetailProjection } from './IWorkItemDetailProjection';
import type { IWorkTrackingProjectionScope } from './IWorkTrackingProjectionScope';
import type { IWorkTrackingProjectionDependencies } from './IWorkTrackingProjectionDependencies';

// #endregion

/** Owns the durable work read model and its scope-specific in-flight provider reads. */
export class WorkTrackingProjectionService {
  // #region Fields

  private _operationalWorkItems: readonly IWorkItem[] | undefined;
  private _workTrackingProjection: IWorkTrackingProjection | undefined;
  private _workTrackingProjectionScope: string | undefined;
  private _workTrackingLoadedAt = 0;
  private _workTrackingRefresh?: Promise<{
    readonly projection: IWorkTrackingProjection;
    readonly status: IRemoteDataStatus;
  }>;
  private _workTrackingRefreshScope: string | undefined;
  private readonly _detailRefreshes = new Map<string, Promise<IWorkItem>>();

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IWorkTrackingProjectionDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Loads the operational work items.
   *
   * @public
   */
  public async loadOperationalWorkItems(): Promise<readonly IWorkItem[]> {
    const scope = this.scope();
    if (
      this._operationalWorkItems &&
      this._workTrackingProjection &&
      this._workTrackingProjectionScope === scope.workTracking &&
      this.isRecentlyLoaded(this._workTrackingLoadedAt)
    ) {
      return this._operationalWorkItems;
    }
    if (this._workTrackingRefresh) {
      if (this._workTrackingRefreshScope === scope.workTracking) {
        return (await this._workTrackingRefresh).projection.workItems;
      }
      try {
        await this._workTrackingRefresh;
      } catch {
        // A refresh for the previous view scope must not block the newly selected workspace.
      }
      return this.loadOperationalWorkItems();
    }
    const operation = this.refreshWorkTrackingProjection(scope).finally(() => {
      if (this._workTrackingRefresh === operation) {
        this._workTrackingRefresh = undefined;
        this._workTrackingRefreshScope = undefined;
      }
    });
    this._workTrackingRefresh = operation;
    this._workTrackingRefreshScope = scope.workTracking;
    try {
      return (await operation).projection.workItems;
    } catch (cause) {
      if (cause instanceof RemoteProjectionScopeChangedError) {
        return this.loadOperationalWorkItems();
      }
      throw cause;
    }
  }

  /**
   * Loads the work item details.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public async loadWorkItemDetails(workItemId: string): Promise<IWorkItem> {
    const summary = (await this.loadOperationalWorkItems()).find((item) => item.id === workItemId);
    if (!summary) throw new Error(`Unknown work item: ${workItemId}`);
    if (summary.detailState === 'complete') return summary;

    const scope = this.scope();
    const key = `${scope.workTracking}:${workItemId}`;
    const active = this._detailRefreshes.get(key);
    if (active) return active;
    const operation = this.loadWorkItemDetailsOnce(scope, summary).finally(() => {
      if (this._detailRefreshes.get(key) === operation) this._detailRefreshes.delete(key);
    });
    this._detailRefreshes.set(key, operation);
    return operation;
  }

  /**
   * Records the work item.
   *
   * @param workItem - Work item.
   * @public
   */
  public recordWorkItem(workItem: IWorkItem): void {
    const scope = this.scope();
    if (workItem.detailState === 'complete') {
      this.saveWorkItemDetail(scope, workItem);
    } else {
      // The item has just been read back from the provider, so this summary is the newest
      // reading of its board state there is. A stored detail from before that read still
      // describes the column the item has left, and nothing would ever correct it: see
      // `withCurrentBoardState` for why its own timestamp cannot notice the move.
      const stored = this.loadWorkItemDetail(scope.workTracking, workItem.id);
      if (stored?.workItem.detailState === 'complete') {
        this.saveWorkItemDetail(scope, this.withCurrentBoardState(workItem, stored.workItem));
      }
    }
    const summary = this.toSummary(workItem);
    if (this._operationalWorkItems) {
      this._operationalWorkItems = this.replaceWorkItem(this._operationalWorkItems, summary);
    }
    if (!this._workTrackingProjection?.refreshedAt || !this._workTrackingProjectionScope) return;
    this._workTrackingProjection = {
      ...this._workTrackingProjection,
      workItems: this.replaceWorkItem(this._workTrackingProjection.workItems, summary),
    };
    this.saveWorkTracking(this._workTrackingProjectionScope, this._workTrackingProjection);
  }

  /**
   * Returns the selected projection, using only this context's stored reads on provider failure.
   *
   * @param forceRefresh - Read the provider even when a projection is already fresh.
   * @public
   */
  public async loadProjection(forceRefresh = false): Promise<{
    readonly projection: IWorkTrackingProjection;
    readonly status: IRemoteDataStatus;
  }> {
    const scope = this.scope();
    if (
      !forceRefresh &&
      this._workTrackingProjectionScope === scope.workTracking &&
      this._workTrackingProjection &&
      this.isRecentlyLoaded(this._workTrackingLoadedAt)
    ) {
      return {
        projection: this._workTrackingProjection,
        status: {
          state: 'current',
          lastSuccessfulRefreshAt: this._workTrackingProjection.refreshedAt,
        },
      };
    }
    if (!forceRefresh && this._workTrackingProjectionScope !== scope.workTracking) {
      const cached = this.loadWorkTracking(scope.workTracking);
      if (cached) {
        const fresh = this.isFresh(cached.refreshedAt);
        this._workTrackingProjection = cached;
        this._workTrackingProjectionScope = scope.workTracking;
        this._workTrackingLoadedAt = Date.now();
        this._operationalWorkItems = fresh ? cached.workItems : undefined;
        return {
          projection: cached,
          status: this.cachedRemoteDataStatus(cached.refreshedAt, fresh),
        };
      }
    }
    if (this._workTrackingRefresh) {
      if (this._workTrackingRefreshScope === scope.workTracking) {
        return this._workTrackingRefresh;
      }
      try {
        await this._workTrackingRefresh;
      } catch {
        // The selected scope has its own cache and provider read below.
      }
      return this.loadProjection(forceRefresh);
    }
    const operation = this.refreshWorkTrackingProjection(scope).finally(() => {
      if (this._workTrackingRefresh === operation) {
        this._workTrackingRefresh = undefined;
        this._workTrackingRefreshScope = undefined;
      }
    });
    this._workTrackingRefresh = operation;
    this._workTrackingRefreshScope = scope.workTracking;
    try {
      return await operation;
    } catch (cause) {
      if (!this._dependencies.repository) throw cause;
      this._operationalWorkItems = undefined;
      this._workTrackingLoadedAt = 0;
      const cached = this.loadWorkTracking(scope.workTracking);
      if (!(cause instanceof RemoteProjectionScopeChangedError)) {
        this._dependencies.reportReadFailure?.('work-items', cause, Boolean(cached));
      }
      if (this.scope().workTracking === scope.workTracking) {
        this._workTrackingProjection = cached;
        this._workTrackingProjectionScope = cached ? scope.workTracking : undefined;
      }
      return cached
        ? {
            projection: cached,
            status: failedRemoteDataStatus(cause, cached.refreshedAt),
          }
        : {
            projection: {
              version: 1,
              workspaceIds: scope.workspaceIds,
              workItems: [],
              projectFields: [],
              boardColumns: [],
              refreshedAt: '',
            },
            status: failedRemoteDataStatus(cause),
          };
    }
  }

  private async refreshWorkTrackingProjection(scope: IWorkTrackingProjectionScope): Promise<{
    readonly projection: IWorkTrackingProjection;
    readonly status: IRemoteDataStatus;
  }> {
    // Azure DevOps derives its board columns while listing items, so the provider-neutral order
    // is intentional. Check the captured scope after every provider await: the router resolves
    // active providers from mutable settings, and a workspace change between two reads must not
    // combine GitHub items with Azure DevOps columns (or vice versa).
    const listedWorkItems = await this._dependencies.tracker.listWorkItems();
    this.assertWorkTrackingScope(scope);
    const providerBoardColumns = this._dependencies.tracker.listBoardColumns
      ? await this._dependencies.tracker.listBoardColumns()
      : [];
    this.assertWorkTrackingScope(scope);
    const projectFields = this._dependencies.tracker.listProjectFields
      ? await this._dependencies.tracker.listProjectFields()
      : [];
    this.assertWorkTrackingScope(scope);
    const workItems = listedWorkItems.map((item) => this.toSummary(item));
    if (this._dependencies.tracker.listBoardColumns) {
      this.assertBoardProjectionComplete(workItems, providerBoardColumns);
    }
    const refreshedAt = this._dependencies.clock.now();
    const projection: IWorkTrackingProjection = {
      version: 1,
      workspaceIds: scope.workspaceIds,
      workItems,
      projectFields,
      boardColumns: providerBoardColumns,
      refreshedAt,
    };
    this.saveWorkTracking(scope.workTracking, projection);
    if (this.scope().workTracking === scope.workTracking) {
      this._workTrackingProjection = projection;
      this._workTrackingProjectionScope = scope.workTracking;
      this._workTrackingLoadedAt = Date.now();
      this._operationalWorkItems = workItems;
    }
    return {
      projection,
      status: { state: 'current', lastSuccessfulRefreshAt: refreshedAt },
    };
  }

  private loadWorkTracking(scope: string): IWorkTrackingProjection | undefined {
    try {
      return this._dependencies.repository?.loadWorkTracking(scope);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('work-items', 'load', cause);
      return undefined;
    }
  }

  private saveWorkTracking(scope: string, projection: IWorkTrackingProjection): void {
    try {
      this._dependencies.repository?.saveWorkTracking(scope, projection);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('work-items', 'save', cause);
    }
  }

  private async loadWorkItemDetailsOnce(
    scope: IWorkTrackingProjectionScope,
    summary: IWorkItem,
  ): Promise<IWorkItem> {
    const cached = this.loadWorkItemDetail(scope.workTracking, summary.id);
    if (
      cached?.workItem.detailState === 'complete' &&
      // A detail stored before Symphony carried discussions has no thread to reuse; fetch it once.
      cached.workItem.comments !== undefined &&
      (!summary.updatedAt || cached.workItem.updatedAt === summary.updatedAt)
    ) {
      // The timestamp only proves the body is still the one that was fetched; the board state
      // around it may well have moved on. Reuse the body, take everything else from the
      // summary, and store the result so the record stops describing an outdated column.
      const complete = this.withCurrentBoardState(summary, cached.workItem);
      this.saveWorkItemDetail(scope, complete);
      return complete;
    }
    const hydrated = this._dependencies.tracker.loadWorkItemDetails
      ? await this._dependencies.tracker.loadWorkItemDetails(summary)
      : { ...summary, detailState: 'complete' as const };
    const complete = { ...hydrated, detailState: 'complete' as const };
    this.saveWorkItemDetail(scope, complete);
    return complete;
  }

  private loadWorkItemDetail(
    scope: string,
    workItemId: string,
  ): IWorkItemDetailProjection | undefined {
    try {
      return this._dependencies.repository?.loadWorkItemDetail?.(scope, workItemId);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('work-items', 'load', cause);
      return undefined;
    }
  }

  private saveWorkItemDetail(scope: IWorkTrackingProjectionScope, workItem: IWorkItem): void {
    try {
      this._dependencies.repository?.saveWorkItemDetail?.(scope.workTracking, {
        version: 1,
        workspaceIds: scope.workspaceIds,
        workItem,
        refreshedAt: this._dependencies.clock.now(),
      });
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('work-items', 'save', cause);
    }
  }

  private assertWorkTrackingScope(scope: IWorkTrackingProjectionScope): void {
    if (this.scope().workTracking !== scope.workTracking) {
      throw new RemoteProjectionScopeChangedError(
        'The active work-tracking scope changed while the board was refreshing.',
      );
    }
  }

  /** Refuses to persist a mixed provider projection produced across two view scopes. */
  private assertBoardProjectionComplete(
    workItems: readonly IWorkItem[],
    boardColumns: IWorkTrackingProjection['boardColumns'],
  ): void {
    const columnKeys = new Set(
      boardColumns.map((column) => `${column.sourceId ?? ''}\u0000${column.id}`),
    );
    const incomplete = workItems.find(
      (item) =>
        item.boardColumnId &&
        !columnKeys.has(`${item.sourceId ?? ''}\u0000${item.boardColumnId}`) &&
        !columnKeys.has(`\u0000${item.boardColumnId}`),
    );
    if (incomplete) {
      throw new Error('The work tracker returned an incomplete board-column projection.');
    }
  }

  /**
   * Puts the stored body back onto the newest reading of the same item.
   *
   * The body and the discussion are the only parts a detail record may still own. Providers keep the board state
   * beside the item rather than on it - a GitHub Project status column, a field value, a claim -
   * so moving an item across the board changes nothing about the issue `updatedAt` describes.
   * A detail record fetched before such a move therefore looks current while still naming the
   * stage, column and field values the item has left behind, and a person who moves an item by
   * hand watches it reappear in the column they took it out of. Only the summary is refreshed
   * from the provider often enough to be trusted with any of that.
   */
  private withCurrentBoardState(summary: IWorkItem, stored: IWorkItem): IWorkItem {
    return {
      ...summary,
      body: stored.body || summary.body,
      comments: stored.comments ?? summary.comments ?? [],
      detailState: 'complete',
    };
  }

  private toSummary(workItem: IWorkItem): IWorkItem {
    if (workItem.detailState === 'summary') return workItem;
    const summary: IWorkItem = { ...workItem, body: '', detailState: 'summary' };
    delete summary.comments;
    return summary;
  }

  private replaceWorkItem(items: readonly IWorkItem[], workItem: IWorkItem): readonly IWorkItem[] {
    return items.some((item) => item.id === workItem.id)
      ? items.map((item) => (item.id === workItem.id ? workItem : item))
      : [...items, workItem];
  }

  private scope(): IWorkTrackingProjectionScope {
    return this._dependencies.scope?.() ?? { workspaceIds: [], workTracking: 'default' };
  }

  private isFresh(refreshedAt: string): boolean {
    return isRemoteProjectionFresh(refreshedAt, this._dependencies.maxAgeMilliseconds?.());
  }

  private isRecentlyLoaded(loadedAt: number): boolean {
    return isRemoteProjectionFresh(loadedAt, this._dependencies.maxAgeMilliseconds?.());
  }

  private cachedRemoteDataStatus(
    refreshedAt: string,
    fresh = this.isFresh(refreshedAt),
  ): IRemoteDataStatus {
    return cachedRemoteDataStatus(refreshedAt, fresh);
  }

  // #endregion
}
