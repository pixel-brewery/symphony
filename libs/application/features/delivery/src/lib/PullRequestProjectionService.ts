// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';
import {
  cachedRemoteDataStatus,
  failedRemoteDataStatus,
  isRemoteProjectionFresh,
  RemoteProjectionScopeChangedError,
} from '@symphony/application-core';
import type { IPullRequestProjection } from '@symphony/domain-delivery';
import type { IPullRequestProjectionScope } from './IPullRequestProjectionScope';
import type { IPullRequestProjectionDependencies } from './IPullRequestProjectionDependencies';

// #endregion

/** Owns the durable delivery read model and its scope-specific in-flight provider reads. */
export class PullRequestProjectionService {
  // #region Fields

  private _pullRequestProjection: IPullRequestProjection | undefined;
  private _pullRequestProjectionScope: string | undefined;
  private _pullRequestLoadedAt = 0;
  private _pullRequestRefresh?: Promise<{
    readonly projection: IPullRequestProjection;
    readonly status: IRemoteDataStatus;
  }>;
  private _pullRequestRefreshScope: string | undefined;

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IPullRequestProjectionDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the selected projection, using only this context's stored reads on provider failure.
   *
   * @param forceRefresh - Read the provider even when a projection is already fresh.
   * @public
   */
  public async loadProjection(forceRefresh = false): Promise<{
    readonly projection: IPullRequestProjection;
    readonly status: IRemoteDataStatus;
  }> {
    const scope = this.scope();
    if (
      !forceRefresh &&
      this._pullRequestProjectionScope === scope.pullRequests &&
      this._pullRequestProjection &&
      this.isRecentlyLoaded(this._pullRequestLoadedAt)
    ) {
      return {
        projection: this._pullRequestProjection,
        status: {
          state: 'current',
          lastSuccessfulRefreshAt: this._pullRequestProjection.refreshedAt,
        },
      };
    }
    if (!forceRefresh && this._pullRequestProjectionScope !== scope.pullRequests) {
      const cached = this.loadPullRequests(scope.pullRequests);
      if (cached) {
        this._pullRequestProjection = cached;
        this._pullRequestProjectionScope = scope.pullRequests;
        this._pullRequestLoadedAt = Date.now();
        return {
          projection: cached,
          status: this.cachedRemoteDataStatus(cached.refreshedAt),
        };
      }
    }
    if (this._pullRequestRefresh) {
      if (this._pullRequestRefreshScope === scope.pullRequests) return this._pullRequestRefresh;
      try {
        await this._pullRequestRefresh;
      } catch {
        // The newly selected workspace has an independent pull-request projection below.
      }
      return this.loadProjection(forceRefresh);
    }
    const operation = this.refreshPullRequestProjection(scope).finally(() => {
      if (this._pullRequestRefresh === operation) {
        this._pullRequestRefresh = undefined;
        this._pullRequestRefreshScope = undefined;
      }
    });
    this._pullRequestRefresh = operation;
    this._pullRequestRefreshScope = scope.pullRequests;
    return operation;
  }

  private async refreshPullRequestProjection(scope: IPullRequestProjectionScope): Promise<{
    readonly projection: IPullRequestProjection;
    readonly status: IRemoteDataStatus;
  }> {
    try {
      const pullRequests = await (this._dependencies.pullRequests?.listPullRequests() ??
        Promise.resolve([]));
      this.assertPullRequestScope(scope);
      const refreshedAt = this._dependencies.clock.now();
      const projection: IPullRequestProjection = {
        version: 1,
        workspaceIds: scope.workspaceIds,
        pullRequests,
        refreshedAt,
      };
      this.savePullRequests(scope.pullRequests, projection);
      if (this.scope().pullRequests === scope.pullRequests) {
        this._pullRequestProjection = projection;
        this._pullRequestProjectionScope = scope.pullRequests;
        this._pullRequestLoadedAt = Date.now();
      }
      return {
        projection,
        status: { state: 'current', lastSuccessfulRefreshAt: refreshedAt },
      };
    } catch (cause) {
      if (!this._dependencies.repository) throw cause;
      this._pullRequestLoadedAt = 0;
      const cached = this.loadPullRequests(scope.pullRequests);
      if (!(cause instanceof RemoteProjectionScopeChangedError)) {
        this._dependencies.reportReadFailure?.('pull-requests', cause, Boolean(cached));
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
              pullRequests: [],
              refreshedAt: '',
            },
            status: failedRemoteDataStatus(cause),
          };
    }
  }

  private loadPullRequests(scope: string): IPullRequestProjection | undefined {
    try {
      return this._dependencies.repository?.loadPullRequests(scope);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('pull-requests', 'load', cause);
      return undefined;
    }
  }

  private savePullRequests(scope: string, projection: IPullRequestProjection): void {
    try {
      this._dependencies.repository?.savePullRequests(scope, projection);
    } catch (cause) {
      this._dependencies.reportPersistenceFailure?.('pull-requests', 'save', cause);
    }
  }

  private assertPullRequestScope(scope: IPullRequestProjectionScope): void {
    if (this.scope().pullRequests !== scope.pullRequests) {
      throw new RemoteProjectionScopeChangedError(
        'The active pull-request scope changed while pull requests were refreshing.',
      );
    }
  }

  private scope(): IPullRequestProjectionScope {
    return this._dependencies.scope?.() ?? { workspaceIds: [], pullRequests: 'default' };
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
