// #region Imports

import { DestroyRef, effect, inject, Injectable, Injector } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';

// #endregion

/** Channel shared by the windows of one Symphony renderer origin. */
const CHANNEL_NAME = 'symphony.settings';

/**
 * Keeps the settings of Symphony's windows in step. Settings is its own window, so a change saved
 * there (the theme, `Show Arcade`, a workspace) must reach the main window, and a change made in
 * the main window (the active workspace) must reach Settings. Every window posts its settings to
 * the others when they change and applies the settings it receives.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class SettingsWindowSync {
  // #region Fields

  private readonly _injector = inject(Injector);
  private _channel: BroadcastChannel | undefined;
  private _fingerprint: string | undefined;

  // #endregion

  // #region Methods

  /**
   * Starts exchanging settings with the other windows; does nothing where `BroadcastChannel` is
   * unavailable.
   *
   * @public
   */
  public connect(): void {
    if (this._channel || typeof BroadcastChannel === 'undefined') return;
    let configuration: ConfigurationStore;
    try {
      configuration = this._injector.get(ConfigurationStore);
    } catch {
      // A host composed without the desktop clients (such as an isolated test) has no
      // configuration to keep in step.
      return;
    }
    const channel = new BroadcastChannel(CHANNEL_NAME);
    this._channel = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const settings = (event.data as { settings?: unknown } | null)?.settings;
      if (typeof settings !== 'object' || settings === null) return;
      const applied = settings as Parameters<ConfigurationStore['applySettings']>[0];
      this._fingerprint = JSON.stringify(applied);
      configuration.applySettings(applied);
    };
    const watcher = effect(
      () => {
        const settings = configuration.settings();
        if (!settings) return;
        const fingerprint = JSON.stringify(settings);
        const previous = this._fingerprint;
        this._fingerprint = fingerprint;
        // The first settings a window loads come from disk like everyone else's.
        if (previous !== undefined && previous !== fingerprint) channel.postMessage({ settings });
      },
      { injector: this._injector },
    );
    this._injector.get(DestroyRef).onDestroy(() => {
      watcher.destroy();
      channel.close();
      this._channel = undefined;
    });
  }

  // #endregion
}
