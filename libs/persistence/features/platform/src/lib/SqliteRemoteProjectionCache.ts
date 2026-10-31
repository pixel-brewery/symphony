// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type {
  IWorkTrackingProjectionRepository,
  IWorkItemDetailProjection,
} from '@symphony/application-work';
import type { IPullRequestProjectionRepository } from '@symphony/application-delivery';
import type { IContinuousIntegrationProjectionRepository } from '@symphony/application-ci';
import type { IContinuousIntegrationProjection } from '@symphony/domain-ci';
import type { IPullRequestProjection } from '@symphony/domain-delivery';
import type { IWorkTrackingProjection } from '@symphony/domain-work';
import type { SqliteDatabase } from '@symphony/persistence-core';
import { remoteProjectionSchema } from './RemoteProjectionSchema';

// #endregion

type ProjectionKind =
  'work-tracking' | 'work-item-detail' | 'pull-requests' | 'continuous-integration';

interface IProjectionRow {
  payload: string;
}

interface IStoredProjectionRow extends IProjectionRow {
  kind: ProjectionKind;
  scope: string;
}

interface IProjectionEnvelope {
  readonly version: 1;
  readonly workspaceIds: readonly string[];
  readonly refreshedAt: string;
}

/**
 * Owns the existing fixed-kind remote cache without creating another row or connection owner.
 *
 * @public
 */
export class SqliteRemoteProjectionCache
  implements
    IWorkTrackingProjectionRepository,
    IPullRequestProjectionRepository,
    IContinuousIntegrationProjectionRepository
{
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Borrows the configuration-root database selected by composition.
   *
   * @param _connection - Shared connection and transaction owner.
   * @public
   */
  public constructor(private readonly _connection: SqliteDatabase) {
    this._database = _connection.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(remoteProjectionSchema);
  }

  /**
   * Loads the work tracking.
   *
   * @param scope - Scope.
   * @public
   */
  public loadWorkTracking(scope: string): IWorkTrackingProjection | undefined {
    return this.load<IWorkTrackingProjection>('work-tracking', scope);
  }

  /**
   * Saves the work tracking.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public saveWorkTracking(scope: string, projection: IWorkTrackingProjection): void {
    this.save('work-tracking', scope, projection);
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
    return this.load<IWorkItemDetailProjection>('work-item-detail', detailScope(scope, workItemId));
  }

  /**
   * Saves the work item detail.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public saveWorkItemDetail(scope: string, projection: IWorkItemDetailProjection): void {
    this.save('work-item-detail', detailScope(scope, projection.workItem.id), projection);
  }

  /**
   * Loads the pull requests.
   *
   * @param scope - Scope.
   * @public
   */
  public loadPullRequests(scope: string): IPullRequestProjection | undefined {
    return this.load<IPullRequestProjection>('pull-requests', scope);
  }

  /**
   * Saves the pull requests.
   *
   * @param scope - Scope.
   * @param projection - Projection.
   * @public
   */
  public savePullRequests(scope: string, projection: IPullRequestProjection): void {
    this.save('pull-requests', scope, projection);
  }

  /**
   * Loads the continuous integration.
   *
   * @param scope - Scope.
   * @public
   */
  public loadContinuousIntegration(scope: string): IContinuousIntegrationProjection | undefined {
    return this.load<IContinuousIntegrationProjection>('continuous-integration', scope);
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
    this.save('continuous-integration', scope, projection);
  }

  /**
   * Removes the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public removeWorkspace(workspaceId: string): void {
    const rows = this._database
      .prepare('SELECT kind, scope, payload FROM remote_projections')
      .all() as unknown as IStoredProjectionRow[];
    const remove = this._database.prepare(
      'DELETE FROM remote_projections WHERE kind = ? AND scope = ?',
    );
    this._connection.immediateTransaction(() => {
      for (const row of rows) {
        const projection = this.parse<IProjectionEnvelope>(row.kind, row.scope, row.payload);
        if (projection?.workspaceIds.includes(workspaceId)) remove.run(row.kind, row.scope);
      }
    });
  }

  private load<T>(kind: ProjectionKind, scope: string): T | undefined {
    const row = this._database
      .prepare('SELECT payload FROM remote_projections WHERE kind = ? AND scope = ?')
      .get(kind, scope) as IProjectionRow | undefined;
    return row ? this.parse<T>(kind, scope, row.payload) : undefined;
  }

  private save(kind: ProjectionKind, scope: string, projection: unknown): void {
    this._database
      .prepare(
        `INSERT INTO remote_projections(kind, scope, payload, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(kind, scope) DO UPDATE SET payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .run(kind, scope, JSON.stringify(projection), new Date().toISOString());
  }

  private parse<T>(kind: ProjectionKind, scope: string, payload: string): T | undefined {
    try {
      const value: unknown = JSON.parse(payload);
      if (!isProjectionEnvelope(value)) throw new Error('Unsupported remote projection payload.');
      return value as T;
    } catch {
      this._database
        .prepare('DELETE FROM remote_projections WHERE kind = ? AND scope = ?')
        .run(kind, scope);
      return undefined;
    }
  }

  // #endregion
}

function detailScope(scope: string, workItemId: string): string {
  return `${scope}:item:${workItemId}`;
}

function isProjectionEnvelope(value: unknown): value is IProjectionEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'workspaceIds' in value &&
    Array.isArray(value.workspaceIds) &&
    value.workspaceIds.every((workspaceId) => typeof workspaceId === 'string') &&
    'refreshedAt' in value &&
    typeof value.refreshedAt === 'string'
  );
}
