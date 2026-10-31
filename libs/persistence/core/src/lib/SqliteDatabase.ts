// #region Imports

import { DatabaseSync } from 'node:sqlite';

// #endregion

/**
 * Owns one SQLite connection and its synchronous transaction lifecycle.
 *
 * @public
 */
export class SqliteDatabase {
  // #region Fields

  /**
   * Connection shared by the feature adapters composed for this database.
   *
   * @public
   * @readonly
   */
  public readonly connection: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Opens the existing database path without changing feature schemas or payloads.
   *
   * @param databasePath - SQLite file selected by the composition root.
   * @public
   */
  public constructor(databasePath: string) {
    this.connection = new DatabaseSync(databasePath);
  }

  // #endregion

  // #region Methods

  /**
   * Commits one synchronous write operation or rolls back all of its writes on failure.
   *
   * @param operation - Writes that must share one immediate transaction.
   * @returns The operation result after the commit succeeds.
   * @public
   */
  public immediateTransaction<T>(operation: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.connection.exec('COMMIT');
      return result;
    } catch (cause) {
      this.connection.exec('ROLLBACK');
      throw cause;
    }
  }

  /**
   * Releases the connection after its composed feature adapters finish using it.
   *
   * @public
   */
  public close(): void {
    this.connection.close();
  }

  // #endregion
}
