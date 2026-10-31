// #region Imports
import { type IExecutableRequestHandler } from './IExecutableRequestHandler';
// #endregion

/**
 * Contributes the concrete request handlers owned by one Utility Process feature.
 *
 * @public
 */
export interface IOrchestratorFeatureContribution {
  readonly id: string;
  readonly handlers: readonly IExecutableRequestHandler[];
}
