// #region Imports

import type { IPullRequestProjectionRepository } from '@symphony/application-delivery';
import type { IPullRequestProjection } from '@symphony/domain-delivery';
import type { SqliteRemoteProjectionCache } from '@symphony/persistence-platform';

// #endregion

/**
 * Exposes only delivery-owned typed projections over the single fixed-kind cache owner.
 *
 * @public
 */
export class SqlitePullRequestProjectionRepository implements IPullRequestProjectionRepository {
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
   * Loads the pull requests.
   *
   * @param scope - Scope.
   * @public
   */
  public loadPullRequests(scope: string): IPullRequestProjection | undefined {
    return this._cache.loadPullRequests(scope);
  }

  /**
   * Saves the pull requests.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public savePullRequests(scope: string, projection: IPullRequestProjection): void {
    return this._cache.savePullRequests(scope, projection);
  }

  // #endregion
}
