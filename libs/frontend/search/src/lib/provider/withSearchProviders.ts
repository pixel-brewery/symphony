// #region Imports

import type { Type } from '@angular/core';
import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { ISearchProvider } from '../models/ISearchProvider';
import type { SearchFeatureKind } from './SearchFeatureKind';
import { SearchFeatureKinds } from './SearchFeatureKinds';
import { SEARCH_PROVIDERS } from './SearchProviders';

// #endregion

/**
 * Registers feature-owned search implementations through the capability's multi-token.
 *
 * @param options - Contribution identity and its injectable search providers.
 * @returns A contribution for the application's explicit search composition.
 * @public
 */
export function withSearchProviders(options: {
  readonly id: string;
  readonly providers: readonly Type<ISearchProvider>[];
}): IFeature<SearchFeatureKind> {
  return createFeature(
    options.id,
    SearchFeatureKinds.Provider,
    options.providers.flatMap((provider) => [
      { provide: provider, useClass: provider },
      { provide: SEARCH_PROVIDERS, useExisting: provider, multi: true },
    ]),
    { multi: true },
  );
}
