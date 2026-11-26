// #region Imports
import type { LocalMobileGateway } from '../../../mobile-gateway';
// #endregion

/**
 * Narrow local desktop administration of the single SDK-backed Symphony host.
 *
 * @public
 */
export interface IProvideMobileOrchestratorFeatureDependencies {
  /**
   * Product facade retaining validated desktop status and awaited SDK mutations.
   *
   * @public
   */
  readonly mobileGateway: Pick<
    LocalMobileGateway,
    | 'status'
    | 'enable'
    | 'disable'
    | 'createChallenge'
    | 'approvePairing'
    | 'rejectPairing'
    | 'revokeDevice'
    | 'revokeAllDevices'
  >;
}
