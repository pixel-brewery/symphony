// #region Imports

import { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { WorkspaceExecutionRepository } from '@symphony/persistence-execution';
import { WorkspaceWorkflowRepository } from '@symphony/persistence-workflow';
import { WorkspaceAutomationRepository } from '@symphony/persistence-automation';
import type { IWorkspaceOperationalRepositoriesOptions } from './IWorkspaceOperationalRepositoriesOptions';
import { operationalSchemas } from './OperationalSchemas';
import { SqliteOperationalRepositories } from './SqliteOperationalRepositories';

// #endregion

/**
 * Composes workspace feature repositories and owns their shared cleanup transaction boundary.
 *
 * @public
 */
export class WorkspaceOperationalRepositories {
  // #region Fields

  private readonly _registry: WorkspaceDatabaseRegistry;

  /**
   * Workspace-routed execution, group, goal and queue persistence.
   *
   * @public
   * @readonly
   */
  public readonly execution: WorkspaceExecutionRepository;

  /**
   * Workspace-routed workflow records and audit persistence.
   *
   * @public
   * @readonly
   */
  public readonly workflow: WorkspaceWorkflowRepository;

  /**
   * Workspace-routed automation receipts, checkpoints and recovery.
   *
   * @public
   * @readonly
   */
  public readonly automation: WorkspaceAutomationRepository;

  // #endregion

  // #region Ctor

  /**
   * Registers the unchanged schema before any feature opens a workspace connection.
   *
   * @param _options - Existing workspace paths, legacy state and optional shared registry.
   * @public
   */
  public constructor(private readonly _options: IWorkspaceOperationalRepositoriesOptions) {
    this._registry = _options.registry ?? new WorkspaceDatabaseRegistry(_options);
    for (const schema of operationalSchemas) this._registry.addSchema(schema);
    this.execution = new WorkspaceExecutionRepository(this._registry, _options.legacy?.execution);
    this.workflow = new WorkspaceWorkflowRepository(this._registry, _options.legacy?.workflow);
    this.automation = new WorkspaceAutomationRepository(
      this._registry,
      _options.legacy?.automation,
    );
  }

  // #endregion

  // #region Methods

  /**
   * Initializes shared storage before indexing the existing execution ownership.
   *
   * @public
   */
  public initialize(): void {
    this._options.legacy?.initialize();
    this._registry.initialize();
    this.execution.initialize();
  }

  /**
   * Deletes the original execution/automation cleanup set before releasing its connection.
   *
   * @param workspaceId - Immutable workspace boundary selected for cleanup.
   * @public
   */
  public removeWorkspaceData(workspaceId: string): void {
    const database = this._registry.existingFor(workspaceId);
    if (database) {
      new SqliteOperationalRepositories(database).deleteWorkspaceData(workspaceId);
      if (!this._options.registry) this._registry.closeWorkspace(workspaceId);
    }
    this._options.legacy?.deleteWorkspaceData(workspaceId);
    this.execution.forgetWorkspace(workspaceId);
  }

  /**
   * Releases shared and legacy connections after their application users stop.
   *
   * @public
   */
  public close(): void {
    if (!this._options.registry) this._registry.close();
    this._options.legacy?.close();
  }

  // #endregion
}
