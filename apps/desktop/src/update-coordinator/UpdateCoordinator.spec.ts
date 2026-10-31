// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { HttpInstallerUpdateAdapter } from '../HttpInstallerUpdateAdapter';
import {
  UpdateCoordinator,
  type IAutoUpdateAdapter,
  type AutoUpdateEvent,
  type IInstallerUpdate,
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
  public readonly downloads: Array<{
    readonly installer: IInstallerUpdate;
    readonly onProgress: (receivedBytes: number) => void;
    readonly signal?: AbortSignal;
    readonly resolve: (filePath: string) => void;
    readonly reject: (error: Error) => void;
  }> = [];
  public readonly launches: string[] = [];
  public result?: IInstallerUpdate;
  public error?: Error;
  public launchError?: Error;

  // #endregion

  // #region Methods

  public async check(feed: {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }): Promise<IInstallerUpdate | undefined> {
    this.checks.push(feed);
    if (this.error) throw this.error;
    return this.result;
  }

  public download(
    installer: IInstallerUpdate,
    options: {
      readonly onProgress: (receivedBytes: number) => void;
      readonly signal?: AbortSignal;
    },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.downloads.push({ installer, ...options, resolve, reject });
    });
  }

  public async launch(filePath: string): Promise<void> {
    if (this.launchError) throw this.launchError;
    this.launches.push(filePath);
  }

  // #endregion
}

function installerUpdate(version = '0.1.11'): IInstallerUpdate {
  return {
    version,
    downloadUrl: `https://github.com/owner/symphony/releases/download/v${version}/Symphony.dmg`,
    fileName: 'Symphony.dmg',
    bytes: 1_000,
    sha256: 'a'.repeat(64),
  };
}

function createCoordinator(
  adapter: FakeAutoUpdateAdapter,
  packaged = true,
  installerAdapter: IInstallerUpdateAdapter = new FakeInstallerUpdateAdapter(),
  options: Partial<
    Pick<IUpdateCoordinatorOptions, 'currentVersion' | 'updateBaseUrl' | 'quitApplication' | 'now'>
  > = {},
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
    quitApplication: options.quitApplication ?? vi.fn(),
    now: options.now ?? (() => new Date('2026-08-10T12:00:00.000Z')),
  });
}

/** A clock the test advances by hand, starting at the fixed check time. */
function manualClock(): { readonly now: () => Date; advance: (milliseconds: number) => void } {
  let current = Date.parse('2026-08-10T12:00:00.000Z');
  return {
    now: () => new Date(current),
    advance: (milliseconds) => {
      current += milliseconds;
    },
  };
}

async function availableInstallerCoordinator(
  options: Partial<Pick<IUpdateCoordinatorOptions, 'quitApplication' | 'now'>> = {},
): Promise<{
  readonly adapter: FakeAutoUpdateAdapter;
  readonly installerAdapter: FakeInstallerUpdateAdapter;
  readonly coordinator: UpdateCoordinator;
}> {
  const adapter = new FakeAutoUpdateAdapter();
  const installerAdapter = new FakeInstallerUpdateAdapter();
  installerAdapter.result = installerUpdate();
  const coordinator = createCoordinator(adapter, true, installerAdapter, options);
  coordinator.start();
  await coordinator.check();
  return { adapter, installerAdapter, coordinator };
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
    await expect(coordinator.install()).resolves.toBe(true);
    expect(adapter.installs).toBe(1);
  });

  it('reports a newer installer-only release without starting the native updater', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const installerAdapter = new FakeInstallerUpdateAdapter();
    installerAdapter.result = installerUpdate('0.1.11');
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
    installerAdapter.result = installerUpdate('0.1.10');
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
      quitApplication: vi.fn(),
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
        quitApplication: vi.fn(),
      });
      expect(coordinator.snapshot()).toMatchObject({
        kind: 'disabled',
        reason: 'not-configured',
      });
    }
  });

  it('does not install until a downloaded update is ready', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const coordinator = createCoordinator(adapter);
    // act
    coordinator.start();

    // assert
    await expect(coordinator.install()).resolves.toBe(false);
    expect(adapter.installs).toBe(0);
  });

  it('downloads an available installer in-app and publishes whole-percent progress at most every 150 ms', async () => {
    // arrange
    const clock = manualClock();
    const { installerAdapter, coordinator } = await availableInstallerCoordinator({
      now: clock.now,
    });
    const published: Array<number | undefined> = [];
    coordinator.subscribe((state) => {
      if (state.kind === 'downloading') published.push(state.progress);
    });

    // act
    const started = coordinator.download();
    const startedAgain = coordinator.download();
    const download = installerAdapter.downloads[0];
    download?.onProgress(5);
    clock.advance(50);
    download?.onProgress(100);
    clock.advance(150);
    download?.onProgress(200);
    clock.advance(200);
    download?.onProgress(205);
    clock.advance(100);
    download?.onProgress(500);
    clock.advance(100);
    download?.resolve('/tmp/symphony-updates/0.1.11-abc/Symphony.dmg');
    await vi.waitFor(() => expect(coordinator.snapshot().kind).toBe('ready'));

    // assert
    expect(started).toBe(true);
    expect(startedAgain).toBe(true);
    expect(installerAdapter.downloads).toHaveLength(1);
    expect(download?.installer).toEqual(installerUpdate());
    expect(published).toEqual([0, 0.2, 0.5]);
    expect(coordinator.snapshot()).toEqual({
      kind: 'ready',
      currentVersion: '0.1.10',
      channel: 'stable',
      lastCheckedAt: '2026-08-10T12:00:00.000Z',
      targetVersion: '0.1.11',
      downloadedAt: '2026-08-10T12:00:00.600Z',
    });
    expect(coordinator.availableDownloadUrl()).toBeUndefined();
  });

  it('reports a failed download and lets the next check offer the update again', async () => {
    // arrange
    const { installerAdapter, coordinator } = await availableInstallerCoordinator();
    coordinator.download();

    // act
    installerAdapter.downloads[0]?.reject(
      new Error('The installer download checksum does not match the update manifest.'),
    );
    await vi.waitFor(() => expect(coordinator.snapshot().kind).toBe('failed'));
    const failed = coordinator.snapshot();
    const rechecked = await coordinator.check();

    // assert
    expect(failed).toMatchObject({
      kind: 'failed',
      code: 'DOWNLOAD_FAILED',
      message: 'Symphony could not download the available update.',
    });
    expect(rechecked).toMatchObject({ kind: 'available', targetVersion: '0.1.11' });
  });

  it('opens the downloaded installer and quits instead of using the native updater', async () => {
    // arrange
    const quitApplication = vi.fn();
    const { adapter, installerAdapter, coordinator } = await availableInstallerCoordinator({
      quitApplication,
    });
    coordinator.download();
    installerAdapter.downloads[0]?.resolve('/tmp/symphony-updates/0.1.11-abc/Symphony.dmg');
    await vi.waitFor(() => expect(coordinator.snapshot().kind).toBe('ready'));

    // act
    const installed = await coordinator.install();

    // assert
    expect(installed).toBe(true);
    expect(installerAdapter.launches).toEqual(['/tmp/symphony-updates/0.1.11-abc/Symphony.dmg']);
    expect(quitApplication).toHaveBeenCalledOnce();
    expect(adapter.installs).toBe(0);
  });

  it('stays open and reports the failure when the downloaded installer cannot be opened', async () => {
    // arrange
    const quitApplication = vi.fn();
    const { installerAdapter, coordinator } = await availableInstallerCoordinator({
      quitApplication,
    });
    coordinator.download();
    installerAdapter.downloads[0]?.resolve('/tmp/symphony-updates/0.1.11-abc/Symphony.dmg');
    await vi.waitFor(() => expect(coordinator.snapshot().kind).toBe('ready'));
    installerAdapter.launchError = new Error('The disk image could not be opened.');

    // act
    const installed = await coordinator.install();

    // assert
    expect(installed).toBe(false);
    expect(quitApplication).not.toHaveBeenCalled();
    expect(coordinator.snapshot()).toMatchObject({ kind: 'failed', code: 'INSTALL_FAILED' });
  });

  it('starts no in-app download without an installer and keeps the native download indeterminate', async () => {
    // arrange
    const adapter = new FakeAutoUpdateAdapter();
    const installerAdapter = new FakeInstallerUpdateAdapter();
    const coordinator = createCoordinator(adapter, true, installerAdapter);
    coordinator.start();
    const startedWhileIdle = coordinator.download();
    await coordinator.check();

    // act
    adapter.emit({ kind: 'available' });
    const startedWhileNativeDownload = coordinator.download();

    // assert
    expect(startedWhileIdle).toBe(false);
    expect(startedWhileNativeDownload).toBe(false);
    expect(installerAdapter.downloads).toHaveLength(0);
    expect(coordinator.snapshot()).toEqual({
      kind: 'downloading',
      currentVersion: '0.1.10',
      channel: 'stable',
      lastCheckedAt: '2026-08-10T12:00:00.000Z',
    });
  });

  it('cancels a running download on dispose without reporting a failure', async () => {
    // arrange
    const { installerAdapter, coordinator } = await availableInstallerCoordinator();
    const states: string[] = [];
    coordinator.subscribe((state) => states.push(state.kind));
    coordinator.download();
    const download = installerAdapter.downloads[0];

    // act
    coordinator.dispose();
    download?.reject(new Error('aborted'));
    await Promise.resolve();

    // assert
    expect(download?.signal?.aborted).toBe(true);
    expect(states).toEqual(['available', 'downloading']);
    expect(coordinator.snapshot().kind).toBe('downloading');
  });
});
