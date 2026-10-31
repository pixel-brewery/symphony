// #region Imports

import { inject } from '@angular/core';
import { SettingsEditorRegistry, type ISettingsEditorRequest } from '@symphony/frontend-setting';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import type { IWorkSourceSettingsEditorRequest } from './IWorkSourceSettingsEditorRequest';

// #endregion

/** The repository sheet's request, owned by the Delivery feature and opened by its kind. */
interface IRepositoryEditorRequest extends ISettingsEditorRequest {
  readonly kind: 'repository';
  readonly workspaceId: string;
  readonly repositoryBindingId?: string;
}

/**
 * Resolves `?section=services&account=<id>` for a GitHub or Azure DevOps account to the sheet its
 * `Edit` button opens: the Azure DevOps source sheet, or the sheet of the repository the GitHub
 * account signs in for when the repository editor is included.
 *
 * @returns The resolver; it answers only for GitHub and Azure DevOps accounts, so AI accounts stay
 * with their own feature.
 * @public
 */
export function resolveWorkAccountEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => IWorkSourceSettingsEditorRequest | IRepositoryEditorRequest | undefined {
  const context = inject(WORK_SOURCE_SETTINGS_CONTEXT);
  const registry = inject(SettingsEditorRegistry);
  return (connectionId, workspaceId) => {
    const settings = context.settings();
    const account = settings?.connections.find(
      (item) => item.id === connectionId && item.workspaceId === workspaceId,
    );
    if (!settings || !account) return undefined;
    if (account.kind === 'azure-devops') {
      const source = settings.workItemSources.find(
        (item) => item.provider === 'azure-devops' && item.connectionId === account.id,
      );
      return { kind: 'azure-devops', workspaceId: account.workspaceId, sourceId: source?.id };
    }
    if (account.kind !== 'github' || !registry.has('repository')) return undefined;
    const repository = settings.repositoryBindings.find(
      (item) => item.sourceControlConnectionId === account.id,
    );
    return {
      kind: 'repository',
      workspaceId: account.workspaceId,
      repositoryBindingId: repository?.id,
    };
  };
}
