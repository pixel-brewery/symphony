// #region Imports
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import { type IProvideMobileOrchestratorFeatureDependencies } from './interfaces/IProvideMobileOrchestratorFeatureDependencies';
import { mobileRequestSchemas, mobileResponseSchemas } from '@symphony/ipc-contracts-mobile';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Registers awaited desktop administration of the single SDK-backed mobile host.
 *
 * @param dependencies - Existing product owners and initialized mobile lifecycle facade.
 * @returns The mobile feature identifier and immutable validated handler collection.
 * @public
 */
export function provideMobileOrchestratorFeature(
  dependencies: IProvideMobileOrchestratorFeatureDependencies,
) {
  const { mobileGateway } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'mobile-access.status.get',
      mobileRequestSchemas['mobile-access.status.get'],
      mobileResponseSchemas['mobile-access.status.get'],
      async () => {
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.enable',
      mobileRequestSchemas['mobile-access.enable'],
      mobileResponseSchemas['mobile-access.enable'],
      async () => {
        try {
          await mobileGateway.enable();
        } catch (cause) {
          if (
            !(cause instanceof RemoteProtocolError) ||
            !['network', 'not-ready'].includes(cause.code)
          )
            throw cause;
        }
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.disable',
      mobileRequestSchemas['mobile-access.disable'],
      mobileResponseSchemas['mobile-access.disable'],
      async () => {
        await mobileGateway.disable();
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.create',
      mobileRequestSchemas['mobile-access.pairing.create'],
      mobileResponseSchemas['mobile-access.pairing.create'],
      async () => {
        return mobileGateway.createChallenge();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.approve',
      mobileRequestSchemas['mobile-access.pairing.approve'],
      mobileResponseSchemas['mobile-access.pairing.approve'],
      async (input) => {
        await mobileGateway.approvePairing(input.pairingId);
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.pairing.reject',
      mobileRequestSchemas['mobile-access.pairing.reject'],
      mobileResponseSchemas['mobile-access.pairing.reject'],
      async (input) => {
        await mobileGateway.rejectPairing(input.pairingId);
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.device.revoke',
      mobileRequestSchemas['mobile-access.device.revoke'],
      mobileResponseSchemas['mobile-access.device.revoke'],
      async (input) => {
        await mobileGateway.revokeDevice(input.deviceId);
        return mobileGateway.status();
      },
    ),
    createOrchestratorRequestHandler(
      'mobile-access.devices.revoke-all',
      mobileRequestSchemas['mobile-access.devices.revoke-all'],
      mobileResponseSchemas['mobile-access.devices.revoke-all'],
      async () => {
        await mobileGateway.revokeAllDevices();
        return mobileGateway.status();
      },
    ),
  ]);
  return Object.freeze({ id: 'mobile', handlers });
}
