// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IWorkItem, WorkItemSource } from '@symphony/domain-work';

// #endregion

export function workItemSourceFor(
  settings: IApplicationSettings,
  workItem: Pick<IWorkItem, 'sourceId' | 'workspaceId'>,
): WorkItemSource | undefined {
  return settings.workItemSources.find(
    (source) =>
      source.id === workItem.sourceId &&
      (!workItem.workspaceId || source.workspaceId === workItem.workspaceId),
  );
}
