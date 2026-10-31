// #region Imports

import type { IWorkTrackingProjectionRepository } from '@symphony/application-work';
import type { IWorkItemDetailProjection } from '@symphony/application-work';
import type { IWorkTrackingProjection } from '@symphony/domain-work';
import type { SqliteRemoteProjectionCache } from '@symphony/persistence-platform';

// #endregion

/**
 * Exposes only work-owned typed projections over the single fixed-kind cache owner.
 *
 * @public
 */
export class SqliteWorkTrackingProjectionRepository implements IWorkTrackingProjectionRepository {
  // #region Ctor

  /**
   * Borrows the shared cache without opening storage or duplicating its records.
   *
   * @param _cache - Configuration-root cache supplied by composition.
   * @public
   */
  public constructor(private readonly _cache: SqliteRemoteProjectionCache) {}

  // #endregion

  // #region Methods

  /**
   * Loads the work tracking.
   *
   * @param scope - Scope.
   * @public
   */
  public loadWorkTracking(scope: string): IWorkTrackingProjection | undefined {
    return this._cache.loadWorkTracking(scope);
  }

  /**
   * Saves the work tracking.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public saveWorkTracking(scope: string, projection: IWorkTrackingProjection): void {
    return this._cache.saveWorkTracking(scope, projection);
  }

  /**
   * Loads the work item detail.
   *
   * @param scope - Scope.
   * @param workItemId - Work item id.
   * @public
   */
  public loadWorkItemDetail(
    scope: string,
    workItemId: string,
  ): IWorkItemDetailProjection | undefined {
    return this._cache.loadWorkItemDetail(scope, workItemId);
  }

  /**
   * Saves the work item detail.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public saveWorkItemDetail(scope: string, projection: IWorkItemDetailProjection): void {
    return this._cache.saveWorkItemDetail(scope, projection);
  }

  // #endregion
}
