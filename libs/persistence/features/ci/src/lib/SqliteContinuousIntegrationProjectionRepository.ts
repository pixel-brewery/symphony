// #region Imports

import type { IContinuousIntegrationProjectionRepository } from '@symphony/application-ci';
import type { IContinuousIntegrationProjection } from '@symphony/domain-ci';
import type { SqliteRemoteProjectionCache } from '@symphony/persistence-platform';

// #endregion

/**
 * Exposes only ci-owned typed projections over the single fixed-kind cache owner.
 *
 * @public
 */
export class SqliteContinuousIntegrationProjectionRepository implements IContinuousIntegrationProjectionRepository {
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
   * Loads the continuous integration.
   *
   * @param scope - Scope.
   * @public
   */
  public loadContinuousIntegration(scope: string): IContinuousIntegrationProjection | undefined {
    return this._cache.loadContinuousIntegration(scope);
  }

  /**
   * Saves the continuous integration.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public saveContinuousIntegration(
    scope: string,
    projection: IContinuousIntegrationProjection,
  ): void {
    return this._cache.saveContinuousIntegration(scope, projection);
  }

  // #endregion
}
