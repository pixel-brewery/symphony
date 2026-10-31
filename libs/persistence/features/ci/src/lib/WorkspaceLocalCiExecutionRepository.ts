// #region Imports

import type { ILocalCiExecutionRepository } from '@symphony/application-ci';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type { ILocalCiExecution } from '@symphony/domain-ci';
import { SqliteLocalCiExecutionRepository } from './SqliteLocalCiExecutionRepository';

// #endregion

/**
 * Routes LocalCiExecution state through the shared workspace database registry.
 *
 * @public
 */
export class WorkspaceLocalCiExecutionRepository implements ILocalCiExecutionRepository {
  // #region Ctor

  /**
   * Binds shared workspace storage and its immutable routing context.
   *
   * @public
   */
  public constructor(private readonly _registry: WorkspaceDatabaseRegistry) {}

  // #endregion

  // #region Methods

  /**
   * Saves the local CI execution.
   *
   * @param execution - Execution.
   * @public
   */
  public saveLocalCiExecution(execution: ILocalCiExecution): void {
    this.repositoryFor(execution.workspaceId).saveLocalCiExecution(execution);
  }

  /**
   * Lists the local CI executions.
   *
   * @public
   */
  public listLocalCiExecutions(): readonly ILocalCiExecution[] {
    return this._registry
      .workspaceIds()
      .flatMap((workspaceId) => this.repositoryFor(workspaceId).listLocalCiExecutions())
      .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))
      .slice(0, 100);
  }

  private repositoryFor(workspaceId: string): SqliteLocalCiExecutionRepository {
    return new SqliteLocalCiExecutionRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}
