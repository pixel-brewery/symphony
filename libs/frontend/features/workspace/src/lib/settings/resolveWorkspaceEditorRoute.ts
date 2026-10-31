// #region Imports

import { inject } from '@angular/core';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';
import type { IWorkspaceSettingsEditorRequest } from './IWorkspaceSettingsEditorRequest';

// #endregion

/**
 * Resolves `?section=workspaces&edit=<id>` to the `Edit workspace` sheet of that workspace.
 *
 * @returns The resolver.
 * @public
 */
export function resolveWorkspaceEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IWorkspaceSettingsEditorRequest | undefined {
  const context = inject(WORKSPACE_SETTINGS_CONTEXT);
  return (editedWorkspaceId) =>
    context.settings()?.workspaces.some((workspace) => workspace.id === editedWorkspaceId)
      ? { kind: 'workspace', workspaceId: editedWorkspaceId }
      : undefined;
}
