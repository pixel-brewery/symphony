// #region Imports

import type { IViewSlotDefinition } from '@pixel-brewery/mosaik-elements-angular';
import type { IWidgetDefinition } from './IWidgetDefinition';

// #endregion

/**
 * Recovers the owning capability's metadata from the native view definition.
 *
 * @param view - Definition already resolved by Mosaik's registry.
 * @returns Whether it contains the category's configured data and geometry.
 * @internal
 */
export function isWidgetDefinition(view: IViewSlotDefinition): view is IWidgetDefinition {
  return (
    'tiles' in view &&
    typeof view.tiles === 'function' &&
    'placements' in view &&
    'label' in view &&
    'testId' in view &&
    'tilesTestId' in view &&
    'empty' in view
  );
}
