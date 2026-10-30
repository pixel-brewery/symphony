// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { ApplicationProjection } from '../state/ApplicationProjection';

// #endregion

/**
 * Projects the shared workspace and repository scope used by feature list pages.
 *
 * @public
 */
@Injectable()
export class WorkspaceScopePresenter {
  // #region Fields

  private readonly _projection = inject(ApplicationProjection);

  /**
   * The workspaces.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(
    () => this._projection.settings()?.workspaces.filter((workspace) => workspace.enabled) ?? [],
  );

  /**
   * The selected workspace IDs.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkspaceIds = this._projection.selectedWorkspaceIds;

  /**
   * The repositories.
   *
   * @public
   * @readonly
   */
  public readonly repositories = this._projection.scopedRepositories;

  // #endregion

  // #region Methods

  /**
   * Returns the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public workspace(workspaceId?: string) {
    return this.workspaces().find((workspace) => workspace.id === workspaceId);
  }

  /**
   * Returns the repository.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public repository(repositoryBindingId: string) {
    return this.repositories().find((repository) => repository.id === repositoryBindingId);
  }

  // #endregion
}
