// #region Imports
import { type IProvideMobileOrchestratorFeatureDependencies } from './IProvideMobileOrchestratorFeatureDependencies';
import { mobileRequestSchemas, mobileResponseSchemas } from '@symphony/ipc-contracts-mobile';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns mobile commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideMobileOrchestratorFeature(
  dependencies: IProvideMobileOrchestratorFeatureDependencies,
) {
  const { mobileAccess, mobileGateway } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'mobile-access.status.get',
      mobileRequestSchemas['mobile-access.status.get'],
      mobileResponseSchemas['mobile-access.status.get'],
      async () => {
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.enable',
      mobileRequestSchemas['mobile-access.enable'],
      mobileResponseSchemas['mobile-access.enable'],
      async () => {
        mobileAccess.enable();
        await mobileGateway.start().catch(() => undefined);
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.disable',
      mobileRequestSchemas['mobile-access.disable'],
      mobileResponseSchemas['mobile-access.disable'],
      async () => {
        await mobileGateway.stop();
        mobileAccess.disable();
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.create',
      mobileRequestSchemas['mobile-access.pairing.create'],
      mobileResponseSchemas['mobile-access.pairing.create'],
      async () => {
        return mobileAccess.createChallenge();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.approve',
      mobileRequestSchemas['mobile-access.pairing.approve'],
      mobileResponseSchemas['mobile-access.pairing.approve'],
      async (input) => {
        mobileAccess.approvePairing(input.pairingId);
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.reject',
      mobileRequestSchemas['mobile-access.pairing.reject'],
      mobileResponseSchemas['mobile-access.pairing.reject'],
      async (input) => {
        mobileAccess.rejectPairing(input.pairingId);
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.device.revoke',
      mobileRequestSchemas['mobile-access.device.revoke'],
      mobileResponseSchemas['mobile-access.device.revoke'],
      async (input) => {
        mobileGateway.disconnectDevice(input.deviceId);
        mobileAccess.revokeDevice(input.deviceId);
        return mobileAccess.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.devices.revoke-all',
      mobileRequestSchemas['mobile-access.devices.revoke-all'],
      mobileResponseSchemas['mobile-access.devices.revoke-all'],
      async () => {
        mobileGateway.disconnectAllDevices();
        mobileAccess.revokeAllDevices();
        return mobileAccess.status();
      },
    ),
  ]);
  return Object.freeze({ id: 'mobile', handlers });
}
