// #region Imports
import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsViewSlot, type ISettingsServiceSelection } from '@symphony/frontend-setting';
// #endregion
/** Registers only this feature's native fragments in the shared Services card. @internal */
export function provideWorkServiceViews(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideViewSlot<ISettingsServiceSelection>(SettingsViewSlot.WorkspaceServicesBoards, [
      {
        id: 'work-configured-boards',
        order: 10,
        canActivate: (selection) => selection?.sectionId === 'services' && !!selection.workspaceId,
        loadComponent: () =>
          import('../settings/WorkBoardsSettingsView').then(
            (module) => module.WorkBoardsSettingsView,
          ),
      },
    ]),
    provideViewSlot<ISettingsServiceSelection>(SettingsViewSlot.WorkspaceServicesAccount, [
      {
        id: 'work-configured-account',
        order: 10,
        canActivate: (selection) =>
          selection?.sectionId === 'services' &&
          !!selection.workspaceId &&
          (selection.connectionKind === 'github' || selection.connectionKind === 'azure-devops'),
        loadComponent: () =>
          import('../settings/WorkConnectionSettingsView').then(
            (module) => module.WorkConnectionSettingsView,
          ),
      },
    ]),
    provideViewSlot<ISettingsServiceSelection>(
      SettingsViewSlot.WorkspaceServicesAvailableConnections,
      [
        {
          id: 'work-available-connections',
          order: 20,
          canActivate: (selection) =>
            selection?.sectionId === 'services' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/WorkAvailableConnectionsView').then(
              (module) => module.WorkAvailableConnectionsView,
            ),
        },
      ],
    ),
  ]);
}
