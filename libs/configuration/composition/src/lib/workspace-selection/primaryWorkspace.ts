// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IWorkspaceDefinition } from '@symphony/domain-workspace';
import { selectedWorkspaces } from './selectedWorkspaces';

// #endregion

export function primaryWorkspace(settings: IApplicationSettings): IWorkspaceDefinition | undefined {
  return (
    selectedWorkspaces(settings)[0] ?? settings.workspaces.find((workspace) => workspace.enabled)
  );
}
