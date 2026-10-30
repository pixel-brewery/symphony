// #region Imports

import { DestroyRef, Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { IDesktopApi, UpdateChannel, UpdateState } from '@symphony/ipc-contracts-desktop';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';

// #endregion

@Injectable({ providedIn: 'root' })
export class DesktopUpdateStore {
  // #region Fields

  private readonly _state = signal<UpdateState | undefined>(undefined);
  private readonly _busy = signal(false);
  private readonly _destroyRef: DestroyRef;
  private readonly _notifications: NotificationService;
  private readonly _desktop: IDesktopApi;
  private _unsubscribe?: () => void;
  private _initializeInFlight?: Promise<void>;
  private _manualCheckPending = false;

  // #endregion

  // #region Ctor

  public constructor(
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(NotificationService)
    notifications: NotificationService = inject(NotificationService),
    @Inject(DESKTOP_CLIENT)
    desktop: IDesktopApi = inject(DESKTOP_CLIENT),
  ) {
    this._destroyRef = destroyRef;
    this._notifications = notifications;
    this._desktop = desktop;
    this._destroyRef.onDestroy(() => this._unsubscribe?.());
  }

  // #endregion

  // #region Properties

  /**
   * Current desktop update state.
   *
   * @public
   */
  public get state(): Signal<UpdateState | undefined> {
    return this._state.asReadonly();
  }

  /**
   * Whether an update operation is active.
   *
   * @public
   */
  public get busy(): Signal<boolean> {
    return this._busy.asReadonly();
  }

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public initialize(): Promise<void> {
    this._initializeInFlight ??= this.initializeOnce();
    return this._initializeInFlight;
  }

  /**
   * Returns the check.
   *
   * @public
   */
  public async check(): Promise<void> {
    const current = this._state();
    if (!current || current.kind === 'disabled' || current.kind === 'ready') return;
    this._manualCheckPending = true;
    this._busy.set(true);
    try {
      this.applyState(await this._desktop.request('updates.check', {}));
    } catch (cause) {
      this._manualCheckPending = false;
      this._notifications.showError(
        'Update check failed.',
        cause instanceof Error ? cause.message : 'Symphony could not check for updates.',
      );
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Sets the channel.
   *
   * @param channel - Channel.
   * @public
   */
  public async setChannel(channel: UpdateChannel): Promise<void> {
    if (this._state()?.channel === channel) return;
    this._busy.set(true);
    try {
      this.applyState(await this._desktop.request('updates.channel.set', { channel }));
      this._notifications.showInfo(
        'Update channel changed.',
        channel === 'stable'
          ? 'Symphony will receive tested stable releases.'
          : 'Symphony will receive every successful canary build.',
      );
    } catch (cause) {
      this._notifications.showError(
        'Update channel could not be changed.',
        cause instanceof Error ? cause.message : 'Unknown update configuration failure.',
      );
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Opens the verified installer download for the available update.
   *
   * @public
   */
  public async download(): Promise<void> {
    const state = this._state();
    if (state?.kind !== 'available') return;
    this._busy.set(true);
    try {
      const result = await this._desktop.request('updates.download', {});
      if (result.outcome === 'opened') {
        this._notifications.showInfo(
          'Update download opened.',
          `Install Symphony ${state.targetVersion} from the downloaded installer.`,
        );
      } else {
        this._notifications.showWarning('No update is available to download.');
      }
    } catch (cause) {
      this._notifications.showError(
        'Update download could not be opened.',
        cause instanceof Error ? cause.message : 'Unknown update download failure.',
      );
    } finally {
      this._busy.set(false);
    }
  }

  /**
   * Installs.
   *
   * @public
   */
  public async install(): Promise<void> {
    this._busy.set(true);
    try {
      const result = await this._desktop.request('updates.install', {});
      if (result.outcome === 'deferred') {
        this._notifications.showInfo(
          'Update postponed.',
          'The downloaded update remains ready for a later restart.',
        );
      } else if (result.outcome === 'not-ready') {
        this._notifications.showWarning('No update is ready to install.');
      }
    } catch (cause) {
      this._notifications.showError(
        'Update could not be installed.',
        cause instanceof Error ? cause.message : 'Unknown update installation failure.',
      );
    } finally {
      this._busy.set(false);
    }
  }

  private async initializeOnce(): Promise<void> {
    this._unsubscribe = this._desktop.onUpdateState((state) => this.applyState(state));
    this.applyState(await this._desktop.request('updates.get', {}));
  }

  private applyState(state: UpdateState): void {
    this._state.set(state);
    if (!this._manualCheckPending) return;
    if (state.kind === 'idle' && state.lastCheckedAt) {
      this._manualCheckPending = false;
      this._notifications.showSuccess('Symphony is up to date.');
    } else if (state.kind === 'available') {
      this._manualCheckPending = false;
      this._notifications.showInfo(
        `Symphony ${state.targetVersion} is available.`,
        'Download the installer when you are ready to update.',
      );
    } else if (state.kind === 'downloading') {
      this._manualCheckPending = false;
      this._notifications.showInfo(
        'A new version is available.',
        'Symphony is downloading it in the background.',
      );
    } else if (state.kind === 'ready') {
      this._manualCheckPending = false;
      this._notifications.showInfo(
        'A new version is ready.',
        'Restart Symphony when you are ready to install it.',
      );
    } else if (state.kind === 'failed') {
      this._manualCheckPending = false;
      this._notifications.showError('Update check failed.', state.message);
    }
  }

  // #endregion
}
