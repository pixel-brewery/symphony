// #region Imports

import { effect, untracked } from '@angular/core';
import type { ISettingsRouteContext } from '@symphony/frontend-setting';

// #endregion

/**
 * Opens the `Build your project team` sheet when the Settings window is asked for
 * `?sheet=setup` (optionally with `workspace`), once per request.
 *
 * @param context - The Settings route's parameters and editor entry point.
 * @public
 */
export function initializeSetupSettingsRoute(context: ISettingsRouteContext): void {
  let requested = '';
  effect(() => {
    const parameters = context.parameters();
    if (parameters.get('sheet') !== 'setup') {
      requested = '';
      return;
    }
    const workspaceId = parameters.get('workspace') ?? undefined;
    const key = `setup:${workspaceId ?? ''}`;
    if (key === requested) return;
    requested = key;
    untracked(() => context.openEditor({ kind: 'setup', ...(workspaceId ? { workspaceId } : {}) }));
  });
}
