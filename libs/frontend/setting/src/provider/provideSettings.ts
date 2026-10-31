// #region Imports

import {
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { provideViewSlot, provideViewSlotFrom } from '@pixel-brewery/mosaik-elements-angular';
import { composeProviders, type IFeature } from '@symphony/frontend-core';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { SettingsEditorRegistry } from '../editor/SettingsEditorRegistry';
import { SettingsEditorService } from '../editor/SettingsEditorService';
import { SettingsWindowSync } from '../sync/SettingsWindowSync';
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
    provideViewSlot(SettingsViewSlot.Appearance, []),
    provideViewSlotFrom(SettingsViewSlot.Global, GlobalSettingsViewSlotProvider),
    provideViewSlotFrom(SettingsViewSlot.Workspace, WorkspaceSettingsViewSlotProvider),
    ...composeProviders([SettingsCatalog, SettingsEditorRegistry, SettingsEditorService], features),
    // Settings is a window of its own; its changes reach the main window and back.
    provideEnvironmentInitializer(() => inject(SettingsWindowSync).connect()),
  ]);
}
