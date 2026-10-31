// #region Imports

import type { IFeature } from './IFeature';

// #endregion

/**
 * Describes a capability-owned incompatibility between frontend contributions.
 *
 * @typeParam TKind - Contribution kinds inspected by the rule.
 * @public
 */
export interface IFeatureIncompatibilityRule<TKind extends string> {
  /**
   * Stable identifier included in a rejected composition's diagnostic.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * Actionable explanation of the incompatible composition.
   *
   * @public
   * @readonly
   */
  readonly message: string;

  /**
   * Determines whether the supplied composition violates the rule.
   *
   * @param features - Complete contribution set for the capability.
   * @returns Whether composition must be rejected.
   * @public
   */
  isViolated(features: ReadonlyArray<IFeature<TKind>>): boolean;
}
