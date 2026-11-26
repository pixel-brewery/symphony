// #region Imports
import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { NodeRemoteSecurity } from '@pixel-brewery/remote-node/security';
import { SymphonyRemoteAccessStore } from './SymphonyRemoteAccessStore';
// #endregion

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'symphony-remote-'));
  roots.push(root);
  return { path: join(root, 'mobile-access.json') };
}

describe('SymphonyRemoteAccessStore', () => {
  it('preserves exact legacy token hashes and creates a stable durable installation identity', async () => {
    // arrange
    const value = await fixture();
    const credential = 'legacy-device-token-1234567890'.padEnd(43, 'x');
    const hash = createHash('sha256').update(credential).digest('hex');
    await writeFile(
      value.path,
      JSON.stringify({
        version: 1,
        enabled: true,
        devices: [
          {
            id: 'legacy-device',
            name: 'Existing browser',
            tokenHash: hash,
            pairedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    const store = new SymphonyRemoteAccessStore(value.path);
    // act
    const state = await store.initialize();
    const restored = await new SymphonyRemoteAccessStore(value.path).initialize();
    const core = new RemoteAccessService({
      identity: restored.identity,
      store,
      security: new NodeRemoteSecurity(),
      clock: { now: () => Date.now() },
      capabilities: ['symphony:read'],
    });
    await core.initialize();
    // assert
    expect(state.identity.appId).toBe('symphony');
    expect(restored.identity).toEqual(state.identity);
    expect(state.devices[0]?.tokenHash).toBe(hash);
    expect(JSON.stringify(state)).not.toContain(credential);
    expect(await core.authorize(credential)).toMatchObject({
      deviceId: 'legacy-device',
      appId: 'symphony',
    });
  });

  it('never falls back to legacy parsing when a version-one identity is malformed or foreign', async () => {
    // arrange
    const value = await fixture();
    const original = JSON.stringify({
      version: 1,
      identity: { appId: 'foreign', hostId: 'other-host' },
      enabled: true,
      devices: [],
    });
    await writeFile(value.path, original);
    // act
    const result = new SymphonyRemoteAccessStore(value.path).initialize();
    // assert
    await expect(result).rejects.toMatchObject({ code: 'persistence' });
    expect(await readFile(value.path, 'utf8')).toBe(original);
  });

  it('serializes last-use observations with revocation and cannot revive a removed grant', async () => {
    // arrange
    const value = await fixture();
    const store = new SymphonyRemoteAccessStore(value.path);
    const initial = await store.initialize();
    const authorized = {
      ...initial,
      enabled: true,
      devices: [
        {
          id: 'device',
          name: 'Browser',
          tokenHash: 'a'.repeat(64),
          capabilities: ['symphony:read'],
          pairedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    await store.save(authorized);
    // act
    await Promise.all([
      store.recordActivity('device', new Date('2026-02-01T00:00:00.000Z')),
      store.save({ ...authorized, devices: [] }),
    ]);
    await store.recordActivity('device');
    // assert
    expect((await store.initialize()).devices).toHaveLength(0);
    expect(
      (JSON.parse(await readFile(value.path, 'utf8')) as { devices: unknown[] }).devices,
    ).toHaveLength(0);
  });
});
