// #region Imports

import { autoUpdater, type AutoUpdater } from 'electron';
import type { IAutoUpdateAdapter, AutoUpdateEvent } from './update-coordinator';

// #endregion

export class ElectronAutoUpdateAdapter implements IAutoUpdateAdapter {
  // #region Fields

  private readonly _updater: AutoUpdater;

  // #endregion

  // #region Ctor

  public constructor(updater: AutoUpdater = autoUpdater) {
    this._updater = updater;
  }

  // #endregion

  // #region Methods

  /**
   * Returns the configure.
   *
   * @param feed - Feed.
   * @public
   */
  public configure(feed: { readonly url: string; readonly serverType?: 'json' }): void {
    this._updater.setFeedURL(feed);
  }

  /**
   * Subscribes.
   *
   * @param listener - Listener.
   * @public
   */
  public subscribe(listener: (event: AutoUpdateEvent) => void): () => void {
    const checking = (): void => listener({ kind: 'checking' });
    const available = (): void => listener({ kind: 'available' });
    const notAvailable = (): void => listener({ kind: 'not-available' });
    const downloaded = (
      _event: Electron.Event,
      releaseNotes: string,
      releaseName: string,
    ): void => {
      const version = releaseName.match(/\d+\.\d+\.\d+/u)?.[0] ?? (releaseName || 'available');
      listener({
        kind: 'downloaded',
        version,
        ...(releaseNotes ? { releaseNotes } : {}),
      });
    };
    const error = (): void => listener({ kind: 'error' });

    this._updater.on('checking-for-update', checking);
    this._updater.on('update-available', available);
    this._updater.on('update-not-available', notAvailable);
    this._updater.on('update-downloaded', downloaded);
    this._updater.on('error', error);
    return () => {
      this._updater.removeListener('checking-for-update', checking);
      this._updater.removeListener('update-available', available);
      this._updater.removeListener('update-not-available', notAvailable);
      this._updater.removeListener('update-downloaded', downloaded);
      this._updater.removeListener('error', error);
    };
  }

  /**
   * Returns the check.
   *
   * @public
   */
  public async check(): Promise<void> {
    await this._updater.checkForUpdates();
  }

  /**
   * Installs.
   *
   * @public
   */
  public install(): void {
    this._updater.quitAndInstall();
  }

  // #endregion
}
