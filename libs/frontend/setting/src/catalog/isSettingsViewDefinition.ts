// #region Imports

import type { IViewSlotDefinition } from '@pixel-brewery/mosaik-elements-angular';
import { GlobalSettingsSectionIds } from '../models/GlobalSettingsSectionIds';
import type { ISettingsSelection } from '../models/ISettingsSelection';
import type { ISettingsViewDefinition } from '../models/ISettingsViewDefinition';
import { WorkspaceSettingsSectionIds } from '../models/WorkspaceSettingsSectionIds';

// #endregion

/**
 * Narrows native slot definitions using the public feature-owned Settings metadata contract.
 *
 * @param view - View returned by the existing Mosaik registry.
 * @returns Whether the view carries valid Settings section metadata.
 * @internal
 */
export function isSettingsViewDefinition(
  view: IViewSlotDefinition<ISettingsSelection>,
): view is ISettingsViewDefinition {
  if (!('section' in view) || typeof view.section !== 'object' || view.section === null)
    return false;
  const section = view.section;
  if (
    !('id' in section) ||
    typeof section.id !== 'string' ||
    !('scope' in section) ||
    !('label' in section) ||
    typeof section.label !== 'string' ||
    !('description' in section) ||
    typeof section.description !== 'string' ||
    !('order' in section) ||
    typeof section.order !== 'number' ||
    !Number.isFinite(section.order)
  )
    return false;
  return (
    (section.scope === 'global' && GlobalSettingsSectionIds.some((id) => id === section.id)) ||
    (section.scope === 'workspace' && WorkspaceSettingsSectionIds.some((id) => id === section.id))
  );
}
