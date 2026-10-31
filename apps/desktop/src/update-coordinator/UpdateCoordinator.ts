// #region Imports

import {
  type UpdateChannel,
  updateChannelSchema,
  type UpdateState,
  updateStateSchema,
} from '@symphony/ipc-contracts-desktop';
import type { AutoUpdateEvent } from './AutoUpdateEvent';
import type { IAutoUpdateAdapter } from './IAutoUpdateAdapter';
import type { IInstallerUpdateAdapter } from './IInstallerUpdateAdapter';
import type { IUpdateCoordinatorOptions } from './IUpdateCoordinatorOptions';

// #endregion

export class UpdateCoordinator {
  // #region Fields

  private readonly _adapter: IAutoUpdateAdapter;
  private readonly _installerAdapter: IInstallerUpdateAdapter;
  private readonly _currentVersion: string;
  private readonly _updateBaseUrl: string;
  private readonly _platform: NodeJS.Platform;
  private readonly _architecture: string;
  private readonly _packaged: boolean;
  private readonly _now: () => Date;
  private readonly _listeners = new Set<(state: UpdateState) => void>();
  private _unsubscribeAdapter?: () => void;
  private _availableDownloadUrl?: string;
  private _state: UpdateState;

  // #endregion

  // #region Ctor

  public constructor(options: IUpdateCoordinatorOptions) {
    this._adapter = options.adapter;
    this._installerAdapter = options.installerAdapter;
    this._currentVersion = options.currentVersion;
    this._updateBaseUrl = options.updateBaseUrl.trim();
    this._platform = options.platform;
    this._architecture = options.architecture;
    this._packaged = options.packaged;
    this._now = options.now ?? (() => new Date());
    this._state = this.initialState(updateChannelSchema.parse(options.channel));
  }

  // #endregion

  // #region Methods

  /**
   * Starts.
   *
   * @public
   */
  public start(): void {
    if (this._unsubscribeAdapter) return;
    this._unsubscribeAdapter = this._adapter.subscribe((event) => this.handleAdapterEvent(event));
    if (this._state.kind !== 'disabled') this.configureFeed(this._state.channel);
  }

  /**
   * Disposes.
   *
   * @public
   */
  public dispose(): void {
    this._unsubscribeAdapter?.();
    this._unsubscribeAdapter = undefined;
    this._listeners.clear();
  }

  /**
   * Snapshots.
   *
   * @public
   */
  public snapshot(): UpdateState {
    return this._state;
  }

  /**
   * Subscribes.
   *
   * @param listener - Listener.
   * @public
   */
  public subscribe(listener: (state: UpdateState) => void): () => void {
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  /**
   * Returns the check.
   *
   * @public
   */
  public async check(): Promise<UpdateState> {
    if (this._state.kind === 'disabled' || this._state.kind === 'ready') return this._state;
    if (this._state.kind === 'checking' || this._state.kind === 'downloading') return this._state;
    this.transition({
      kind: 'checking',
      currentVersion: this._currentVersion,
      channel: this._state.channel,
      ...(this._state.lastCheckedAt ? { lastCheckedAt: this._state.lastCheckedAt } : {}),
    });
    try {
      const installerUpdate = await this._installerAdapter.check(this.installerFeed());
      if (installerUpdate) {
        const lastCheckedAt = this._now().toISOString();
        if (this.isNewerVersion(installerUpdate.version)) {
          this._availableDownloadUrl = installerUpdate.downloadUrl;
          this.transition({
            kind: 'available',
            currentVersion: this._currentVersion,
            channel: this._state.channel,
            lastCheckedAt,
            targetVersion: installerUpdate.version,
          });
        } else {
          this._availableDownloadUrl = undefined;
          this.transition({
            kind: 'idle',
            currentVersion: this._currentVersion,
            channel: this._state.channel,
            lastCheckedAt,
          });
        }
        return this._state;
      }
      await this._adapter.check();
    } catch {
      this.fail('CHECK_FAILED', 'Symphony could not check for updates.');
    }
    return this._state;
  }

  /**
   * Sets the channel.
   *
   * @param channel - Channel.
   * @public
   */
  public setChannel(channel: UpdateChannel): UpdateState {
    const validatedChannel = updateChannelSchema.parse(channel);
    if (validatedChannel === this._state.channel) return this._state;
    if (this._state.kind === 'checking' || this._state.kind === 'downloading') {
      throw new Error('The update channel cannot change while an update check is active.');
    }
    this._state = this.initialState(validatedChannel);
    this._availableDownloadUrl = undefined;
    if (this._state.kind !== 'disabled') this.configureFeed(validatedChannel);
    this.publish();
    return this._state;
  }

  /**
   * Installs.
   *
   * @public
   */
  public install(): boolean {
    if (this._state.kind !== 'ready') return false;
    try {
      this._adapter.install();
      return true;
    } catch {
      this.fail('INSTALL_FAILED', 'Symphony could not start the update installation.');
      return false;
    }
  }

  /**
   * Returns the trusted installer URL for the available update.
   *
   * @public
   */
  public availableDownloadUrl(): string | undefined {
    return this._state.kind === 'available' ? this._availableDownloadUrl : undefined;
  }

  private initialState(channel: UpdateChannel): UpdateState {
    const base = { currentVersion: this._currentVersion, channel } as const;
    if (!this._packaged) return { ...base, kind: 'disabled', reason: 'development' };
    if (this._platform !== 'darwin' && this._platform !== 'win32') {
      return { ...base, kind: 'disabled', reason: 'unsupported-platform' };
    }
    if (!this.validUpdateBaseUrl()) return { ...base, kind: 'disabled', reason: 'not-configured' };
    return { ...base, kind: 'idle' };
  }

  private configureFeed(channel: UpdateChannel): void {
    const baseUrl = this._updateBaseUrl.replace(/\/+$/u, '');
    const directory = `${baseUrl}/channels/${channel}/${this._platform}/${this._architecture}`;
    this._adapter.configure(
      this._platform === 'darwin'
        ? { url: `${directory}/RELEASES.json`, serverType: 'json' }
        : { url: directory },
    );
  }

  private installerFeed(): {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  } {
    const baseUrl = this._updateBaseUrl.replace(/\/+$/u, '');
    return {
      url: `${baseUrl}/channels/${this._state.channel}/${this._platform}/${this._architecture}/installer.json`,
      platform: this._platform,
      architecture: this._architecture,
    };
  }

  private isNewerVersion(candidate: string): boolean {
    const currentParts = this._currentVersion.split('.').map(Number);
    const candidateParts = candidate.split('.').map(Number);
    if (
      currentParts.length !== 3 ||
      candidateParts.length !== 3 ||
      currentParts.some((part) => !Number.isInteger(part) || part < 0) ||
      candidateParts.some((part) => !Number.isInteger(part) || part < 0)
    ) {
      throw new Error('Desktop update versions must use numeric major.minor.patch values.');
    }
    for (let index = 0; index < 3; index += 1) {
      if (candidateParts[index] !== currentParts[index]) {
        return (candidateParts[index] ?? 0) > (currentParts[index] ?? 0);
      }
    }
    return false;
  }

  private validUpdateBaseUrl(): boolean {
    try {
      const url = new URL(this._updateBaseUrl);
      return (
        url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      );
    } catch {
      return false;
    }
  }

  private handleAdapterEvent(event: AutoUpdateEvent): void {
    if (
      this._state.kind === 'disabled' ||
      this._state.kind === 'available' ||
      this._state.kind === 'ready'
    )
      return;
    const base = {
      currentVersion: this._currentVersion,
      channel: this._state.channel,
      lastCheckedAt: this._now().toISOString(),
    } as const;
    switch (event.kind) {
      case 'checking':
        this.transition({ ...base, kind: 'checking' });
        return;
      case 'available':
        this.transition({ ...base, kind: 'downloading' });
        return;
      case 'not-available':
        this.transition({ ...base, kind: 'idle' });
        return;
      case 'downloaded':
        this.transition({
          ...base,
          kind: 'ready',
          targetVersion: event.version,
          ...(event.releaseNotes ? { releaseNotes: event.releaseNotes } : {}),
          downloadedAt: this._now().toISOString(),
        });
        return;
      case 'error':
        this.fail(
          this._state.kind === 'downloading' ? 'DOWNLOAD_FAILED' : 'CHECK_FAILED',
          this._state.kind === 'downloading'
            ? 'Symphony could not download the available update.'
            : 'Symphony could not check for updates.',
        );
    }
  }

  private fail(code: 'CHECK_FAILED' | 'DOWNLOAD_FAILED' | 'INSTALL_FAILED', message: string): void {
    this.transition({
      kind: 'failed',
      currentVersion: this._currentVersion,
      channel: this._state.channel,
      ...(this._state.lastCheckedAt ? { lastCheckedAt: this._state.lastCheckedAt } : {}),
      code,
      message,
    });
  }

  private transition(state: UpdateState): void {
    this._state = updateStateSchema.parse(state);
    this.publish();
  }

  private publish(): void {
    for (const listener of this._listeners) listener(this._state);
  }

  // #endregion
}
