// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { IRepositoryTrustRepository } from '@symphony/application-workspace';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type { IRepositoryTrustGrant } from '@symphony/domain-workspace';
import { repositoryTrustSchema } from './RepositoryTrustSchema';

// #endregion

interface IPayloadRow {
  readonly payload: string;
}

/**
 * Persists only the RepositoryTrust records through a shared database owner.
 *
 * @public
 */
export class SqliteRepositoryTrustRepository implements IRepositoryTrustRepository {
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Uses the database connection supplied by composition.
   *
   * @param database - Shared SQLite connection owner.
   * @public
   */
  public constructor(database: SqliteDatabase) {
    this._database = database.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies this feature's unchanged schema for independent adapter use.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(repositoryTrustSchema);
  }

  /**
   * Returns the trust grant.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public trustGrant(repositoryBindingId: string): IRepositoryTrustGrant | undefined {
    const row = this._database
      .prepare('SELECT payload FROM repository_trust_grants WHERE repository_binding_id = ?')
      .get(repositoryBindingId) as IPayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as IRepositoryTrustGrant) : undefined;
  }

  /**
   * Saves the trust grant.
   *
   * @param grant - Grant.
   * @public
   */
  public saveTrustGrant(grant: IRepositoryTrustGrant): void {
    this._database
      .prepare(
        `INSERT INTO repository_trust_grants(
           repository_binding_id, workspace_id, payload, updated_at
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(repository_binding_id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .run(grant.repositoryBindingId, grant.workspaceId, JSON.stringify(grant), grant.grantedAt);
  }

  /**
   * Revokes the trust grant.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public revokeTrustGrant(repositoryBindingId: string): void {
    this._database
      .prepare('DELETE FROM repository_trust_grants WHERE repository_binding_id = ?')
      .run(repositoryBindingId);
  }

  // #endregion
}
