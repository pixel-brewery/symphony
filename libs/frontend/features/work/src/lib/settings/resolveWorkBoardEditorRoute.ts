// #region Imports

import { inject } from '@angular/core';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import type { IWorkSourceSettingsEditorRequest } from './IWorkSourceSettingsEditorRequest';

// #endregion

/**
 * Resolves `?section=services&board=<id>` to the GitHub Projects or Azure DevOps sheet of that
 * workspace's board.
 *
 * @returns The resolver.
 * @public
 */
export function resolveWorkBoardEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IWorkSourceSettingsEditorRequest | undefined {
  const context = inject(WORK_SOURCE_SETTINGS_CONTEXT);
  return (sourceId, workspaceId) => {
    const source = context
      .settings()
      ?.workItemSources.find((item) => item.id === sourceId && item.workspaceId === workspaceId);
    return source && source.provider !== 'simulated'
      ? { kind: source.provider, workspaceId: source.workspaceId, sourceId: source.id }
      : undefined;
  };
}
