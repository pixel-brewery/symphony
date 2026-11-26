// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import type { IProvideMobileOrchestratorFeatureDependencies } from './interfaces/IProvideMobileOrchestratorFeatureDependencies';
import { provideMobileOrchestratorFeature } from './provideMobileOrchestratorFeature';
// #endregion

function fixture() {
  const status = { enabled: true, state: 'unavailable' as const, pendingPairings: [], devices: [] };
  const gateway: IProvideMobileOrchestratorFeatureDependencies['mobileGateway'] = {
    status: () => status,
    enable: async () => undefined,
    disable: async () => undefined,
    createChallenge: async () => ({
      pairingUrl: 'http://192.168.1.2/#pair=fixture',
      expiresAt: '2026-11-26T12:05:00.000Z',
    }),
    approvePairing: async () => undefined,
    rejectPairing: async () => undefined,
    revokeDevice: async () => undefined,
    revokeAllDevices: async () => undefined,
  };
  return { gateway, status };
}

describe('provideMobileOrchestratorFeature', () => {
  it('retains enabled intent for a network failure while propagating a persistence failure', async () => {
    // arrange
    const value = fixture();
    value.gateway.enable = async () => {
      throw new RemoteProtocolError('network', 'Private network unavailable.');
    };
    const handlers = provideMobileOrchestratorFeature({ mobileGateway: value.gateway }).handlers;
    const enable = handlers.find((handler) => handler.method === 'mobile-access.enable')!;
    // act
    const enabledStatus = await enable.execute({}, () => undefined);
    // assert
    expect(enabledStatus).toEqual(value.status);
    value.gateway.enable = async () => {
      throw new RemoteProtocolError('persistence', 'Private write failed.');
    };
    await expect(enable.execute({}, () => undefined)).rejects.toMatchObject({
      code: 'persistence',
    });
  });

  it('waits for revocation persistence before returning the updated status', async () => {
    // arrange
    const value = fixture();
    let commit!: () => void;
    let committed = false;
    const pending = new Promise<void>((complete) => {
      commit = complete;
    });
    value.gateway.revokeAllDevices = async () => {
      await pending;
      committed = true;
    };
    const read = vi.fn(() => {
      expect(committed).toBe(true);
      return value.status;
    });
    value.gateway.status = read;
    const revoke = provideMobileOrchestratorFeature({ mobileGateway: value.gateway }).handlers.find(
      (handler) => handler.method === 'mobile-access.devices.revoke-all',
    )!;
    // act
    const operation = revoke.execute({}, () => undefined);
    await Promise.resolve();
    expect(read).not.toHaveBeenCalled();
    commit();
    await operation;
    // assert
    expect(read).toHaveBeenCalledTimes(1);
  });
});
