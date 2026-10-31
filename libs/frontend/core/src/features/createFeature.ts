// #region Imports

import type { Provider } from '@angular/core';
import type { FeatureKind } from './FeatureKind';
import type { IFeature } from './IFeature';
import type { IFeatureOptions } from './IFeatureOptions';

// #endregion

/**
 * Captures an immutable frontend contribution and its provider registrations.
 *
 * @param id - Stable identifier unique within the contribution kind.
 * @param kind - Category whose composition rules apply.
 * @param providers - Registrations contributed to the owning capability.
 * @param options - Multiplicity policy; a kind is exclusive by default.
 * @returns The contribution with captured providers and options.
 * @public
 */
export function createFeature<TKind extends string>(
  id: string,
  kind: FeatureKind<TKind>,
  providers: ReadonlyArray<Provider>,
  options: Readonly<IFeatureOptions> = { multi: false },
): IFeature<TKind> {
  const safeProviders = Object.freeze([...providers]);
  const safeOptions: Readonly<IFeatureOptions> = Object.freeze({ multi: options.multi ?? false });

  return Object.freeze({
    id,
    kind,
    options: safeOptions,
    provide: (): ReadonlyArray<Provider> => safeProviders,
  });
}
