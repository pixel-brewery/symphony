// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { SkillsSearchProvider } from '../search/SkillsSearchProvider';

// #endregion

/**
 * Contributes the skills feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withSkillsSearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'skills-search', providers: [SkillsSearchProvider] });
}
