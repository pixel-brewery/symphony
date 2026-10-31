// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlot, provideViewSlotFrom } from '@pixel-brewery/mosaik-elements-angular';
import { composeProviders, withNavigationItems, type IFeature } from '@symphony/frontend-core';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { SettingsEditorRegistry } from '../editor/SettingsEditorRegistry';
import { SettingsEditorService } from '../editor/SettingsEditorService';
import { GlobalSettingsViewSlotProvider } from './GlobalSettingsViewSlotProvider';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { WorkspaceSettingsViewSlotProvider } from './WorkspaceSettingsViewSlotProvider';

// #endregion

/**
 * Provides the native Settings hosts and generic editor composition, including an empty product.
 *
 * @param features - Optional explicitly composed Settings contributions.
 * @returns The native Mosaik view-slot infrastructure and Settings projections.
 * @public
 */
export function provideSettings(
  ...features: readonly IFeature<SettingsFeatureKind>[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [],
      [
        withNavigationItems({
          id: 'settings-workspace-menu',
          items: {
            key: 'settings',
            label: 'Settings',
            icon: 'settings',
            route: '/main/settings',
            region: 'workspace-menu',
            order: 20,
          },
        }),
      ],
    ),
    provideViewSlot(SettingsViewSlot.Appearance, []),
    provideViewSlotFrom(SettingsViewSlot.Global, GlobalSettingsViewSlotProvider),
    provideViewSlotFrom(SettingsViewSlot.Workspace, WorkspaceSettingsViewSlotProvider),
    ...composeProviders([SettingsCatalog, SettingsEditorRegistry, SettingsEditorService], features),
  ]);
}
