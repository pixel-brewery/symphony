// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

type Workspace = ApplicationSettingsDto['workspaces'][number];

@Pipe({ name: 'workspaceSelectionSummary', standalone: true, pure: true })
export class WorkspaceSelectionSummaryPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param selected - Selected.
   * @param workItemCount - Work item count.
   * @public
   */
  public transform(selected: readonly Workspace[], workItemCount: number): string {
    return selected.length
      ? `${selected.map((workspace) => workspace.displayName).join(', ')} · ${workItemCount} work items`
      : 'Select a workspace to load its work items.';
  }

  // #endregion
}
