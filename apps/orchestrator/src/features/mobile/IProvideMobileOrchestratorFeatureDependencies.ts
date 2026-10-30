// #region Imports
import { type MobileAccessService } from '@symphony/application-mobile';
import { type LocalMobileGateway } from '../../mobile-gateway';
// #endregion

/**
 * Consumes only the capabilities required by mobile orchestration.
 *
 * @public
 */
export interface IProvideMobileOrchestratorFeatureDependencies {
  readonly mobileAccess: Pick<
    MobileAccessService,
    | 'status'
    | 'enable'
    | 'disable'
    | 'createChallenge'
    | 'approvePairing'
    | 'rejectPairing'
    | 'revokeDevice'
    | 'revokeAllDevices'
  >;
  readonly mobileGateway: Pick<
    LocalMobileGateway,
    'start' | 'stop' | 'disconnectDevice' | 'disconnectAllDevices'
  >;
}
