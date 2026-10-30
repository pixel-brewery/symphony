// #region Imports

import type { Provider } from '@angular/core';
import type { FeatureKind } from './FeatureKind';
import type { IFeatureOptions } from './IFeatureOptions';

// #endregion

/**
 * Contributes Angular providers to one explicitly composed frontend capability.
 *
 * @typeParam TKind - Contribution kinds accepted by the owning capability.
 * @public
 */
export interface IFeature<TKind extends string> {
  /**
   * Stable identifier that is unique within the contribution kind.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * Category whose registration rules govern the contribution.
   *
   * @public
   * @readonly
   */
  readonly kind: FeatureKind<TKind>;

  /**
   * Multiplicity policy evaluated before the contribution is materialized.
   *
   * @public
   * @readonly
   */
  readonly options: Readonly<IFeatureOptions>;

  /**
   * Provides the registrations after the complete feature set has been validated.
   *
   * @returns Providers contributed to the owning capability.
   * @public
   */
  provide(): ReadonlyArray<Provider>;
}
