// #region Imports

import type { IRepositoryTrustRepository } from '@symphony/application-workspace';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type { IRepositoryTrustGrant } from '@symphony/domain-workspace';
import { SqliteRepositoryTrustRepository } from './SqliteRepositoryTrustRepository';

// #endregion

/**
 * Routes RepositoryTrust state through the shared workspace database registry.
 *
 * @public
 */
export class WorkspaceRepositoryTrustRepository implements IRepositoryTrustRepository {
  // #region Ctor

  /**
   * Binds shared workspace storage and its immutable routing context.
   *
   * @public
   */
  public constructor(
    private readonly _registry: WorkspaceDatabaseRegistry,
    private readonly _workspaceForRepository: (repositoryBindingId: string) => string | undefined,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Returns the trust grant.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public trustGrant(repositoryBindingId: string): IRepositoryTrustGrant | undefined {
    const workspaceId = this._workspaceForRepository(repositoryBindingId);
    return workspaceId
      ? this.repositoryFor(workspaceId).trustGrant(repositoryBindingId)
      : undefined;
  }

  /**
   * Saves the trust grant.
   *
   * @param grant - Grant.
   * @public
   */
  public saveTrustGrant(grant: IRepositoryTrustGrant): void {
    this.repositoryFor(grant.workspaceId).saveTrustGrant(grant);
  }

  /**
   * Revokes the trust grant.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public revokeTrustGrant(repositoryBindingId: string): void {
    const workspaceId = this._workspaceForRepository(repositoryBindingId);
    if (workspaceId) this.repositoryFor(workspaceId).revokeTrustGrant(repositoryBindingId);
  }

  private repositoryFor(workspaceId: string): SqliteRepositoryTrustRepository {
    return new SqliteRepositoryTrustRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}
