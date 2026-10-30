// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';
import {
  cachedRemoteDataStatus,
  failedRemoteDataStatus,
  isRemoteProjectionFresh,
  RemoteProjectionScopeChangedError,
} from '@symphony/application-core';
import type { ICiRun, ICiWorkflow, IContinuousIntegrationProjection } from '@symphony/domain-ci';
import type { IContinuousIntegrationProjectionScope } from './IContinuousIntegrationProjectionScope';
import type { IContinuousIntegrationProjectionDependencies } from './IContinuousIntegrationProjectionDependencies';

// #endregion

/** Owns the durable ci read model and its scope-specific in-flight provider reads. */
export class ContinuousIntegrationProjectionService {
  // #region Fields

  private _continuousIntegrationProjection: IContinuousIntegrationProjection | undefined;
  private _continuousIntegrationProjectionScope: string | undefined;
  private _continuousIntegrationLoadedAt = 0;
  private _continuousIntegrationRefresh?: Promise<{
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  }>;
  private _continuousIntegrationRefreshScope: string | undefined;

  // #endregion

  // #region Ctor

  public constructor(
    private readonly _dependencies: IContinuousIntegrationProjectionDependencies,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Refreshes the continuous integration.
   *
   * @param includeWorkflowCatalog - Also refresh repository workflow definitions and capabilities.
   * @public
   */
  public async refresh(includeWorkflowCatalog = false): Promise<{
    readonly ciWorkflows: readonly ICiWorkflow[];
    readonly ciRuns: readonly ICiRun[];
    readonly status: IRemoteDataStatus;
  }> {
    const result = includeWorkflowCatalog
      ? await this.loadProjection(true)
      : await this.loadContinuousIntegrationRunsProjection();
    return {
      ciWorkflows: result.projection.ciWorkflows ?? [],
      ciRuns: result.projection.ciRuns,
      status: result.status,
    };
  }

  private async loadContinuousIntegrationRunsProjection(): Promise<{
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  }> {
    const scope = this.scope();
    if (this._continuousIntegrationRefresh) {
      if (this._continuousIntegrationRefreshScope === scope.continuousIntegration) {
        return this._continuousIntegrationRefresh;
      }
      try {
        await this._continuousIntegrationRefresh;
      } catch {
        // The newly selected workspace has an independent Actions projection below.
      }
      return this.loadContinuousIntegrationRunsProjection();
    }
    const operation = this.refreshContinuousIntegrationRunsProjection(scope).finally(() => {
      if (this._continuousIntegrationRefresh === operation) {
        this._continuousIntegrationRefresh = undefined;
        this._continuousIntegrationRefreshScope = undefined;
      }
    });
    this._continuousIntegrationRefresh = operation;
    this._continuousIntegrationRefreshScope = scope.continuousIntegration;
    return operation;
  }

  /**
   * Returns the selected projection, using only this context's stored reads on provider failure.
   *
   * @param forceRefresh - Read the provider even when a projection is already fresh.
   * @public
   */
  public async loadProjection(forceRefresh = false): Promise<{
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  }> {
    const scope = this.scope();
    if (
      !forceRefresh &&
      this._continuousIntegrationProjectionScope === scope.continuousIntegration &&
      this._continuousIntegrationProjection &&
      this.isRecentlyLoaded(this._continuousIntegrationLoadedAt)
    ) {
      return {
        projection: this._continuousIntegrationProjection,
        status: {
          state: 'current',
          lastSuccessfulRefreshAt: this._continuousIntegrationProjection.refreshedAt,
        },
      };
    }
    if (
      !forceRefresh &&
      this._continuousIntegrationProjectionScope !== scope.continuousIntegration
    ) {
      const cached = this.loadContinuousIntegration(scope.continuousIntegration);
      if (cached) {
        this._continuousIntegrationProjection = cached;
        this._continuousIntegrationProjectionScope = scope.continuousIntegration;
        this._continuousIntegrationLoadedAt = Date.now();
        return {
          projection: cached,
          status: this.cachedRemoteDataStatus(cached.refreshedAt),
        };
      }
    }
    if (this._continuousIntegrationRefresh) {
      if (this._continuousIntegrationRefreshScope === scope.continuousIntegration) {
        return this._continuousIntegrationRefresh;
      }
      try {
        await this._continuousIntegrationRefresh;
      } catch {
        // The newly selected workspace has an independent Actions projection below.
      }
      return this.loadProjection(forceRefresh);
    }
    const operation = this.refreshContinuousIntegrationProjection(scope).finally(() => {
      if (this._continuousIntegrationRefresh === operation) {
        this._continuousIntegrationRefresh = undefined;
        this._continuousIntegrationRefreshScope = undefined;
      }
    });
    this._continuousIntegrationRefresh = operation;
    this._continuousIntegrationRefreshScope = scope.continuousIntegration;
    return operation;
  }

  private async refreshContinuousIntegrationProjection(
    scope: IContinuousIntegrationProjectionScope,
  ): Promise<{
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  }> {
    try {
      const [ciWorkflows, ciRuns] = await Promise.all([
        this._dependencies.ci?.listWorkflows?.() ?? Promise.resolve([]),
        this._dependencies.ci?.listRuns() ?? Promise.resolve([]),
      ]);
      this.assertContinuousIntegrationScope(scope);
      const refreshedAt = this._dependencies.clock.now();
      const projection: IContinuousIntegrationProjection = {
        version: 1,
        workspaceIds: scope.workspaceIds,
        ciWorkflows,
        ciRuns,
        refreshedAt,
      };
      this.saveContinuousIntegration(scope.continuousIntegration, projection);
      if (this.scope().continuousIntegration === scope.continuousIntegration) {
        this._continuousIntegrationProjection = projection;
        this._continuousIntegrationProjectionScope = scope.continuousIntegration;
        this._continuousIntegrationLoadedAt = Date.now();
      }
      return {
        projection,
        status: { state: 'current', lastSuccessfulRefreshAt: refreshedAt },
      };
    } catch (cause) {
      if (!this._dependencies.repository) throw cause;
      return this.failedContinuousIntegrationProjection(scope, cause);
    }
  }

  private async refreshContinuousIntegrationRunsProjection(
    scope: IContinuousIntegrationProjectionScope,
  ): Promise<{
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  }> {
    try {
      const ciRuns = await (this._dependencies.ci?.listRuns() ?? Promise.resolve([]));
      this.assertContinuousIntegrationScope(scope);
      const previous =
        this._continuousIntegrationProjectionScope === scope.continuousIntegration
          ? this._continuousIntegrationProjection
          : this.loadContinuousIntegration(scope.continuousIntegration);
      const refreshedAt = this._dependencies.clock.now();
      const projection: IContinuousIntegrationProjection = {
        version: 1,
        workspaceIds: scope.workspaceIds,
        ciWorkflows: previous?.ciWorkflows ?? [],
        ciRuns,
        refreshedAt,
      };
      this.saveContinuousIntegration(scope.continuousIntegration, projection);
      if (this.scope().continuousIntegration === scope.continuousIntegration) {
        this._continuousIntegrationProjection = projection;
        this._continuousIntegrationProjectionScope = scope.continuousIntegration;
        this._continuousIntegrationLoadedAt = Date.now();
      }
      return {
        projection,
        status: { state: 'current', lastSuccessfulRefreshAt: refreshedAt },
      };
    } catch (cause) {
      if (!this._dependencies.repository) throw cause;
      return this.failedContinuousIntegrationProjection(scope, cause);
    }
  }

  private failedContinuousIntegrationProjection(
    scope: IContinuousIntegrationProjectionScope,
    cause: unknown,
  ): {
    readonly projection: IContinuousIntegrationProjection;
    readonly status: IRemoteDataStatus;
  } {
    this._continuousIntegrationLoadedAt = 0;
    const cached = this.loadContinuousIntegration(scope.continuousIntegration);
    if (!(cause instanceof RemoteProjectionScopeChangedError)) {
      this._dependencies.reportReadFailure?.('ci-runs', cause, Boolean(cached));
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
            ciWorkflows: [],
            ciRuns: [],
            refreshedAt: '',
          },
          status: failedRemoteDataStatus(cause),
        };
  }

  private loadContinuousIntegration(scope: string): IContinuousIntegrationProjection | undefined {
    try {
      return this._dependencies.repository?.loadContinuousIntegration(scope);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('ci-runs', 'load', cause);
      return undefined;
    }
  }

  private saveContinuousIntegration(
    scope: string,
    projection: IContinuousIntegrationProjection,
  ): void {
    try {
      this._dependencies.repository?.saveContinuousIntegration(scope, projection);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('ci-runs', 'save', cause);
    }
  }

  private assertContinuousIntegrationScope(scope: IContinuousIntegrationProjectionScope): void {
    if (this.scope().continuousIntegration !== scope.continuousIntegration) {
      throw new RemoteProjectionScopeChangedError(
        'The active Actions scope changed while runs were refreshing.',
      );
    }
  }

  private scope(): IContinuousIntegrationProjectionScope {
    return this._dependencies.scope?.() ?? { workspaceIds: [], continuousIntegration: 'default' };
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
