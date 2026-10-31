// #region Imports

import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { IWorkspaceDatabaseRegistryOptions } from './IWorkspaceDatabaseRegistryOptions';
import { SqliteDatabase } from './SqliteDatabase';

// #endregion

/**
 * Shares workspace database connections and applies composition-supplied schema contributions.
 *
 * @public
 */
export class WorkspaceDatabaseRegistry {
  // #region Fields

  private readonly _databases = new Map<string, SqliteDatabase>();
  private readonly _schemas: string[] = [];

  // #endregion

  // #region Ctor

  /**
   * Binds the current workspace selection and its immutable storage-path policy.
   *
   * @param _options - Identifiers and paths supplied by the composition root.
   * @public
   */
  public constructor(private readonly _options: IWorkspaceDatabaseRegistryOptions) {}

  // #endregion

  // #region Methods

  /**
   * Adds one owning feature's schema in the order selected by composition.
   *
   * @param schema - Idempotent SQL contribution, without transaction ownership.
   * @public
   */
  public addSchema(schema: string): void {
    if (this._schemas.includes(schema)) return;
    for (const database of this._databases.values()) database.connection.exec(schema);
    this._schemas.push(schema);
  }

  /**
   * Opens the currently configured workspace databases through the shared owner.
   *
   * @public
   */
  public initialize(): void {
    for (const workspaceId of this.workspaceIds()) this.databaseFor(workspaceId);
  }

  /**
   * Reads the current configured workspace order without retaining a stale selection.
   *
   * @returns Identifiers supplied by the composition root.
   * @public
   */
  public workspaceIds(): readonly string[] {
    return this._options.workspaceIds();
  }

  /**
   * Returns the one connection owned for the selected workspace database path.
   *
   * @param workspaceId - Immutable workspace boundary.
   * @returns Its initialized database connection owner.
   * @public
   */
  public databaseFor(workspaceId: string): SqliteDatabase {
    const path = resolve(this._options.databasePath(workspaceId));
    const existing = this._databases.get(path);
    if (existing) return existing;
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const database = new SqliteDatabase(path);
    try {
      for (const schema of this._schemas) database.connection.exec(schema);
      chmodSync(path, 0o600);
    } catch (cause) {
      database.close();
      throw cause;
    }
    this._databases.set(path, database);
    return database;
  }

  /**
   * Reads an already-open workspace database without creating storage during cleanup.
   *
   * @param workspaceId - Workspace selected for cleanup.
   * @returns Its open database, when one exists.
   * @public
   */
  public existingFor(workspaceId: string): SqliteDatabase | undefined {
    return this._databases.get(resolve(this._options.databasePath(workspaceId)));
  }

  /**
   * Releases one workspace connection after the composed cleanup commits.
   *
   * @param workspaceId - Workspace whose connection is no longer in use.
   * @public
   */
  public closeWorkspace(workspaceId: string): void {
    const path = resolve(this._options.databasePath(workspaceId));
    const database = this._databases.get(path);
    if (!database) return;
    database.close();
    this._databases.delete(path);
  }

  /**
   * Releases all connections after the composed persistence users have stopped.
   *
   * @public
   */
  public close(): void {
    for (const database of this._databases.values()) database.close();
    this._databases.clear();
  }

  // #endregion
}
