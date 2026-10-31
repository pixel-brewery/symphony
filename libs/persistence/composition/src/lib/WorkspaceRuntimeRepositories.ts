// #region Imports

import { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { WorkspaceRepositoryTrustRepository } from '@symphony/persistence-workspace';
import {
  WorkspaceCiRunHistoryRepository,
  WorkspaceVerificationRepository,
  WorkspaceLocalCiExecutionRepository,
} from '@symphony/persistence-ci';
import type { IWorkspaceRuntimeRepositoriesOptions } from './IWorkspaceRuntimeRepositoriesOptions';
import { runtimeSchemas } from './RuntimeSchemas';
import { SqliteRuntimeRepositories } from './SqliteRuntimeRepositories';

// #endregion

/**
 * Composes workspace trust and CI persistence with one original cleanup transaction.
 *
 * @public
 */
export class WorkspaceRuntimeRepositories {
  // #region Fields

  private readonly _registry: WorkspaceDatabaseRegistry;

  /**
   * Workspace-routed machine-local trust.
   *
   * @public
   * @readonly
   */
  public readonly trust: WorkspaceRepositoryTrustRepository;

  /**
   * Workspace-routed verification plans and runs.
   *
   * @public
   * @readonly
   */
  public readonly verification: WorkspaceVerificationRepository;

  /**
   * Workspace-routed bounded local-CI evidence.
   *
   * @public
   * @readonly
   */
  public readonly localCi: WorkspaceLocalCiExecutionRepository;

  /**
   * Workspace-routed finished workflow runs.
   *
   * @public
   * @readonly
   */
  public readonly ciRunHistory: WorkspaceCiRunHistoryRepository;

  // #endregion

  // #region Ctor

  /**
   * Registers unchanged runtime schemas before creating the narrow routing adapters.
   *
   * @param _options - Workspace paths, repository routing and optional shared registry.
   * @public
   */
  public constructor(private readonly _options: IWorkspaceRuntimeRepositoriesOptions) {
    this._registry = _options.registry ?? new WorkspaceDatabaseRegistry(_options);
    for (const schema of runtimeSchemas) this._registry.addSchema(schema);
    this.trust = new WorkspaceRepositoryTrustRepository(
      this._registry,
      _options.workspaceForRepository,
    );
    this.verification = new WorkspaceVerificationRepository(this._registry);
    this.localCi = new WorkspaceLocalCiExecutionRepository(this._registry);
    this.ciRunHistory = new WorkspaceCiRunHistoryRepository(this._registry);
  }

  // #endregion

  // #region Methods

  /**
   * Opens the configured workspace databases through their shared owner.
   *
   * @public
   */
  public initialize(): void {
    this._registry.initialize();
  }

  /**
   * Deletes the exact original runtime table set without closing borrowed storage.
   *
   * @param workspaceId - Workspace selected for cleanup.
   * @public
   */
  public removeWorkspace(workspaceId: string): void {
    new SqliteRuntimeRepositories(this._registry.databaseFor(workspaceId)).removeWorkspace(
      workspaceId,
    );
    if (!this._options.registry) this._registry.closeWorkspace(workspaceId);
  }

  /**
   * Closes storage only when this composition created its registry.
   *
   * @public
   */
  public close(): void {
    if (!this._options.registry) this._registry.close();
  }

  // #endregion
}
