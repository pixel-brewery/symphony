// #region Imports
import { describe, expect, it } from 'vitest';
import { MobileAccessService } from '@symphony/application-mobile';
import { defaultPersistedMobileAccess } from '@symphony/mobile-contracts';
import { provideMobileOrchestratorFeature } from './provideMobileOrchestratorFeature';
// #endregion

function accessService() {
  return new MobileAccessService({
    repository: { load: () => defaultPersistedMobileAccess, save: (settings) => settings },
    security: { randomToken: () => 'test-token', hash: (value) => value },
    now: () => new Date('2026-10-30T08:00:00.000Z'),
  });
}

describe('provideMobileOrchestratorFeature', () => {
  it('retains access activation when the network gateway cannot start', async () => {
    // arrange
    const access = accessService();
    const feature = provideMobileOrchestratorFeature({
      mobileAccess: access,
      mobileGateway: {
        start: async () => {
          throw new Error('Network unavailable');
        },
        stop: async () => undefined,
        disconnectDevice: () => undefined,
        disconnectAllDevices: () => undefined,
      },
    });
    const enable = feature.handlers.find((handler) => handler.method === 'mobile-access.enable');
    if (!enable) throw new Error('Mobile enable request missing');
    // act
    const result = await enable.execute({}, () => undefined);
    // assert
    expect(result).toMatchObject({ enabled: true, state: 'starting' });
    expect(access.isEnabled()).toBe(true);
  });

  it('stops the gateway before disabling access and disconnects before revoking devices', async () => {
    // arrange
    const access = accessService();
    access.enable();
    const order: string[] = [];
    const feature = provideMobileOrchestratorFeature({
      mobileAccess: access,
      mobileGateway: {
        start: async () => undefined,
        stop: async () => {
          order.push(access.isEnabled() ? 'stop-enabled' : 'stop-disabled');
        },
        disconnectDevice: () => undefined,
        disconnectAllDevices: () => {
          order.push('disconnect');
        },
      },
    });
    const disable = feature.handlers.find((handler) => handler.method === 'mobile-access.disable');
    const revoke = feature.handlers.find(
      (handler) => handler.method === 'mobile-access.devices.revoke-all',
    );
    if (!disable || !revoke) throw new Error('Mobile lifecycle requests missing');
    // act
    await revoke.execute({}, () => undefined);
    await disable.execute({}, () => undefined);
    // assert
    expect(order).toEqual(['disconnect', 'stop-enabled']);
    expect(access.status()).toMatchObject({ enabled: false, state: 'disabled', devices: [] });
  });
});
