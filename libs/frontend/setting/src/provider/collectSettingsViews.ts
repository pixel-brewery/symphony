// #region Imports

import { createFeature, validateFeatures } from '@symphony/frontend-core';
import type { ISettingsViewContribution } from '../models/ISettingsViewContribution';
import type { ISettingsViewDefinition } from '../models/ISettingsViewDefinition';
import { SettingsFeatureKinds } from './SettingsFeatureKinds';

// #endregion

/**
 * Resolves static capability configuration before handing cards to Mosaik's existing registry.
 *
 * @param contributions - Included feature registrations.
 * @param slot - Native slot whose views are requested.
 * @returns The cards in deliberate registration order; Mosaik owns sorting and visibility.
 * @internal
 */
export function collectSettingsViews(
  contributions: readonly ISettingsViewContribution[],
  slot: string,
): ISettingsViewDefinition[] {
  validateFeatures(
    contributions.map((entry) =>
      createFeature(entry.id, SettingsFeatureKinds.View, [], { multi: true }),
    ),
  );
  const views = contributions
    .filter((entry) => entry.slot === slot)
    .flatMap((entry) => entry.views);
  const ids = new Set<string>();
  for (const view of views) {
    if (ids.has(view.id))
      throw new Error(`Duplicate settings view '${view.id}' in slot '${slot}'.`);
    ids.add(view.id);
  }
  return views;
}
