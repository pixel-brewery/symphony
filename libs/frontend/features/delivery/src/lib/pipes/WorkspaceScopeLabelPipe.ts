// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IWorkspaceOption {
  readonly id: string;
  readonly displayName: string;
}

@Pipe({ name: 'workspaceScopeLabel', standalone: true, pure: true })
export class WorkspaceScopeLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param workspaces - Workspaces.
   * @param selectedWorkspaceIds - Selected workspace ids.
   * @public
   */
  public transform(
    workspaces: readonly IWorkspaceOption[],
    selectedWorkspaceIds: readonly string[],
  ): string {
    const selected = workspaces.filter((workspace) => selectedWorkspaceIds.includes(workspace.id));
    return selected[0]?.displayName ?? 'No workspace selected';
  }

  // #endregion
}
