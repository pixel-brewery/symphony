// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { HttpInstallerUpdateAdapter } from '../HttpInstallerUpdateAdapter';
import {
  UpdateCoordinator,
  type IAutoUpdateAdapter,
  type AutoUpdateEvent,
  type IInstallerUpdateAdapter,
  type IUpdateCoordinatorOptions,
} from './';

// #endregion

class FakeAutoUpdateAdapter implements IAutoUpdateAdapter {
  // #region Fields

  public configuredFeed?: { readonly url: string; readonly serverType?: 'json' };
  public checks = 0;
  public installs = 0;
  private _listener?: (event: AutoUpdateEvent) => void;

  // #endregion

  // #region Methods

  public configure(feed: { readonly url: string; readonly serverType?: 'json' }): void {
    this.configuredFeed = feed;
  }

  public subscribe(listener: (event: AutoUpdateEvent) => void): () => void {
    this._listener = listener;
    return () => {
      this._listener = undefined;
    };
  }

  public async check(): Promise<void> {
    this.checks += 1;
  }

  public install(): void {
    this.installs += 1;
  }

  public emit(event: AutoUpdateEvent): void {
    this._listener?.(event);
  }

  // #endregion
}

class FakeInstallerUpdateAdapter implements IInstallerUpdateAdapter {
  // #region Fields

  public readonly checks: Array<{
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }> = [];
  public result?: { readonly version: string; readonly downloadUrl: string };
  public error?: Error;

  // #endregion

  // #region Methods

  public async check(feed: {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }): Promise<{ readonly version: string; readonly downloadUrl: string } | undefined> {
    this.checks.push(feed);
    if (this.error) throw this.error;
    return this.result;
  }

  // #endregion
}

function createCoordinator(
  adapter: FakeAutoUpdateAdapter,
  packaged = true,
  installerAdapter: IInstallerUpdateAdapter = new FakeInstallerUpdateAdapter(),
  options: Partial<Pick<IUpdateCoordinatorOptions, 'currentVersion' | 'updateBaseUrl'>> = {},
): UpdateCoordinator {
  return new UpdateCoordinator({
    adapter,
    installerAdapter,
    currentVersion: options.currentVersion ?? '0.1.10',
    channel: 'stable',
    updateBaseUrl: options.updateBaseUrl ?? 'https://updates.example.com/symphony/',
    platform: 'darwin',
    architecture: 'arm64',
    packaged,
    now: () => new Date('2026-08-10T12:00:00.000Z'),
  });
}

describe('UpdateCoordinator', () => {
  it('keeps development builds disabled and does not contact the update feed', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter, false);

    coordinator.start();
    // act
    await coordinator.check();

    // assert
    expect(coordinator.snapshot()).toEqual({
      kind: 'disabled',
      reason: 'development',
      currentVersion: '0.1.10',
      channel: 'stable',
    });
    expect(adapter.configuredFeed).toBeUndefined();
    expect(adapter.checks).toBe(0);
  });

  it('uses a fixed platform, architecture and channel feed and publishes update transitions', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    const states: string[] = [];
    coordinator.subscribe((state) => states.push(state.kind));
    coordinator.start();

    await coordinator.check();
    adapter.emit({ kind: 'available' });
    // act
    adapter.emit({
      kind: 'downloaded',
      version: '0.1.11',
      releaseNotes: 'Safer lifecycle handling.',
    });

    // assert
    expect(adapter.configuredFeed).toEqual({
      url: 'https://updates.example.com/symphony/channels/stable/darwin/arm64/RELEASES.json',
      serverType: 'json',
    });
    expect(states).toEqual(['idle', 'checking', 'downloading', 'ready']);
    expect(coordinator.snapshot()).toEqual({
      kind: 'ready',
      currentVersion: '0.1.10',
      channel: 'stable',
      lastCheckedAt: '2026-08-10T12:00:00.000Z',
      targetVersion: '0.1.11',
      releaseNotes: 'Safer lifecycle handling.',
      downloadedAt: '2026-08-10T12:00:00.000Z',
    });
    expect(coordinator.install()).toBe(true);
    expect(adapter.installs).toBe(1);
  });

  it('reports a newer installer-only release without starting the native updater', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const installerAdapter = new FakeInstallerUpdateAdapter();
    installerAdapter.result = {
      version: '0.1.11',
      downloadUrl: 'https://github.com/owner/symphony/releases/download/v0.1.11/Symphony.dmg',
    };
    const coordinator = createCoordinator(adapter, true, installerAdapter);
    coordinator.start();

    // act
    const state = await coordinator.check();

    // assert
    expect(installerAdapter.checks).toEqual([
      {
        url: 'https://updates.example.com/symphony/channels/stable/darwin/arm64/installer.json',
        platform: 'darwin',
        architecture: 'arm64',
      },
    ]);
    expect(adapter.checks).toBe(0);
    expect(state).toEqual({
      kind: 'available',
      currentVersion: '0.1.10',
      channel: 'stable',
      lastCheckedAt: '2026-08-10T12:00:00.000Z',
      targetVersion: '0.1.11',
    });
    expect(coordinator.availableDownloadUrl()).toBe(installerAdapter.result.downloadUrl);
  });

  it('reports the current installer release as up to date without consulting a stale native feed', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const installerAdapter = new FakeInstallerUpdateAdapter();
    installerAdapter.result = {
      version: '0.1.10',
      downloadUrl: 'https://github.com/owner/symphony/releases/download/v0.1.10/Symphony.dmg',
    };
    const coordinator = createCoordinator(adapter, true, installerAdapter);
    coordinator.start();

    // act
    const state = await coordinator.check();

    // assert
    expect(state).toMatchObject({ kind: 'idle', currentVersion: '0.1.10' });
    expect(adapter.checks).toBe(0);
    expect(coordinator.availableDownloadUrl()).toBeUndefined();
  });

  it.each([
    { change: 'patch', version: '0.1.17', expectedKind: 'available' },
    { change: 'minor', version: '0.2.0', expectedKind: 'available' },
    { change: 'major', version: '1.0.0', expectedKind: 'available' },
    { change: 'older', version: '0.1.9', expectedKind: 'idle' },
    { change: 'current', version: '0.1.16', expectedKind: 'idle' },
  ] as const)(
    'compares the $change public installer manifest through the real HTTP adapter without native checks',
    async ({ version, expectedKind }) => {
      // arrange
      const adapter = new FakeAutoUpdateAdapter();
      const updateBaseUrl = 'https://pixel-brewery.github.io/symphony';
      const name = `Symphony-darwin-arm64-${version}.dmg`;
      const downloadUrl = `https://github.com/pixel-brewery/symphony/releases/download/v${version}/${name}`;
      const fetchImplementation = vi.fn<typeof fetch>(async () =>
        Response.json({
          schemaVersion: 1,
          version,
          platform: 'darwin',
          architecture: 'arm64',
          artifact: { name, bytes: 123, sha256: 'a'.repeat(64), url: downloadUrl },
        }),
      );
      const coordinator = createCoordinator(
        adapter,
        true,
        new HttpInstallerUpdateAdapter(fetchImplementation),
        { currentVersion: '0.1.16', updateBaseUrl },
      );
      coordinator.start();

      // act
      const state = await coordinator.check();

      // assert
      expect(fetchImplementation).toHaveBeenCalledExactlyOnceWith(
        `${updateBaseUrl}/channels/stable/darwin/arm64/installer.json`,
        expect.objectContaining({ headers: { accept: 'application/json' }, redirect: 'follow' }),
      );
      expect(state).toEqual({
        kind: expectedKind,
        currentVersion: '0.1.16',
        channel: 'stable',
        lastCheckedAt: '2026-08-10T12:00:00.000Z',
        ...(expectedKind === 'available' ? { targetVersion: version } : {}),
      });
      expect(adapter.checks).toBe(0);
      expect(coordinator.availableDownloadUrl()).toBe(
        expectedKind === 'available' ? downloadUrl : undefined,
      );
      expect(coordinator.snapshot()).toEqual(state);
      expect(JSON.stringify(state)).not.toMatch(/https?:\/\//u);
    },
  );

  it('falls back to the native updater when an origin has no installer manifest yet', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    coordinator.start();

    // act
    await coordinator.check();

    // assert
    expect(adapter.checks).toBe(1);
    expect(coordinator.snapshot().kind).toBe('checking');
  });

  it('fails safely when the installer manifest cannot be checked', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const installerAdapter = new FakeInstallerUpdateAdapter();
    installerAdapter.error = new Error('unavailable');
    const coordinator = createCoordinator(adapter, true, installerAdapter);
    coordinator.start();

    // act
    const state = await coordinator.check();

    // assert
    expect(state).toMatchObject({ kind: 'failed', code: 'CHECK_FAILED' });
    expect(adapter.checks).toBe(0);
  });

  it('switches only to validated channels and reconfigures the trusted feed', () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    // act
    coordinator.start();

    // assert
    expect(coordinator.setChannel('canary')).toMatchObject({ kind: 'idle', channel: 'canary' });
    expect(adapter.configuredFeed).toEqual({
      url: 'https://updates.example.com/symphony/channels/canary/darwin/arm64/RELEASES.json',
      serverType: 'json',
    });
  });

  it('keeps the current state when the selected channel does not change', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    coordinator.start();
    await coordinator.check();
    adapter.emit({ kind: 'not-available' });
    const current = coordinator.snapshot();

    // act
    const actual = coordinator.setChannel('stable');

    // assert
    expect(actual).toBe(current);
    expect(coordinator.snapshot()).toMatchObject({
      kind: 'idle',
      channel: 'stable',
      lastCheckedAt: '2026-08-10T12:00:00.000Z',
    });
  });

  it('uses the Squirrel directory feed on Windows', () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = new UpdateCoordinator({
      adapter,
      installerAdapter: new FakeInstallerUpdateAdapter(),
      currentVersion: '0.1.10',
      channel: 'stable',
      updateBaseUrl: 'https://updates.example.com/symphony',
      platform: 'win32',
      architecture: 'x64',
      packaged: true,
    });

    // act
    coordinator.start();

    // assert
    expect(adapter.configuredFeed).toEqual({
      url: 'https://updates.example.com/symphony/channels/stable/win32/x64',
    });
  });

  it('rejects non-HTTPS and credential-bearing update origins', () => {
    // assert
    for (const updateBaseUrl of [
      'http://updates.example.com',
      'https://user:secret@updates.example.com',
      'https://updates.example.com?token=secret',
    ]) {
      const coordinator = new UpdateCoordinator({
        adapter: new FakeAutoUpdateAdapter(),
        installerAdapter: new FakeInstallerUpdateAdapter(),
        currentVersion: '0.1.10',
        channel: 'stable',
        updateBaseUrl,
        platform: 'win32',
        architecture: 'x64',
        packaged: true,
      });
      expect(coordinator.snapshot()).toMatchObject({
        kind: 'disabled',
        reason: 'not-configured',
      });
    }
  });

  it('does not install until a downloaded update is ready', () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    // act
    coordinator.start();

    // assert
    expect(coordinator.install()).toBe(false);
    expect(adapter.installs).toBe(0);
  });
});
