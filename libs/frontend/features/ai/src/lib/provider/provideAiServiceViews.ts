// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlot } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsViewSlot, type ISettingsServiceSelection } from '@symphony/frontend-setting';
// #endregion
/** Registers only this feature's native fragments in the shared Services card. @internal */
export function provideAiServiceViews(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideViewSlot<ISettingsServiceSelection>(SettingsViewSlot.WorkspaceServicesAccount, [
      {
        id: 'ai-configured-account',
        order: 10,
        canActivate: (selection) =>
          selection?.sectionId === 'services' &&
          !!selection.workspaceId &&
          (selection.connectionKind === 'codex' ||
            selection.connectionKind === 'claude' ||
            selection.connectionKind === 'opencode'),
        loadComponent: () =>
          import('../settings/AiAccountSettingsView').then(
            (module) => module.AiAccountSettingsView,
          ),
      },
    ]),
    provideViewSlot<ISettingsServiceSelection>(
      SettingsViewSlot.WorkspaceServicesAvailableConnections,
      [
        {
          id: 'ai-available-connections',
          order: 10,
          canActivate: (selection) =>
            selection?.sectionId === 'services' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/AiAvailableConnectionsView').then(
              (module) => module.AiAvailableConnectionsView,
            ),
        },
      ],
    ),
  ]);
}
