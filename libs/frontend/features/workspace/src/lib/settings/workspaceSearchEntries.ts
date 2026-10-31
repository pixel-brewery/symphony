// #region Imports

import { computed, inject, type Signal } from '@angular/core';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';

// #endregion

/**
 * One `Search settings` entry per workspace in `Workspaces`, found by name and short code; a
 * disabled workspace says so, and the result opens the `Edit workspace` sheet.
 *
 * The workspace's own sections are found by its name already, because every workspace result
 * carries the workspace name in its breadcrumb.
 *
 * @returns The entries of every workspace.
 * @public
 */
export function workspaceSearchEntries(): Signal<readonly ISettingsSearchEntry[]> {
  const context = inject(WORKSPACE_SETTINGS_CONTEXT);
  return computed(() =>
    (context.settings()?.workspaces ?? []).map((workspace): ISettingsSearchEntry => ({
      id: `workspace-${workspace.id}`,
      label: workspace.displayName,
      description: `Workspace · ${workspace.shortCode}`,
      keywords: ['workspace', 'rename', 'short code', 'color'],
      ...(workspace.enabled ? {} : { value: 'Disabled' }),
      parameters: { edit: workspace.id },
    })),
  );
}
