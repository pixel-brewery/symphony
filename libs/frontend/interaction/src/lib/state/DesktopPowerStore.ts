// #region Imports

import { DestroyRef, Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { IDesktopApi, PowerState } from '@symphony/ipc-contracts-desktop';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';

// #endregion

@Injectable({ providedIn: 'root' })
export class DesktopPowerStore {
  // #region Fields

  private readonly _state = signal<PowerState | undefined>(undefined);
  private readonly _busy = signal(false);
  private readonly _destroyRef: DestroyRef;
  private readonly _notifications: NotificationService;
  private readonly _desktop: IDesktopApi;
  private _unsubscribe?: () => void;
  private _initializeInFlight?: Promise<void>;

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
   * Current desktop power state.
   *
   * @public
   */
  public get state(): Signal<PowerState | undefined> {
    return this._state.asReadonly();
  }

  /**
   * Whether a power-setting operation is active.
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
   * Sets whether Symphony keeps this machine awake while background tasks run.
   *
   * @param enabled - Enabled.
   * @public
   */
  public async setKeepAwakeWhileBusy(enabled: boolean): Promise<void> {
    if (this._state()?.keepAwakeWhileBusy === enabled) return;
    this._busy.set(true);
    try {
      this._state.set(await this._desktop.request('power.keep-awake.set', { enabled }));
    } catch (cause) {
      this._notifications.showError(
        'Sleep prevention could not be changed.',
        cause instanceof Error ? cause.message : 'Unknown power configuration failure.',
      );
    } finally {
      this._busy.set(false);
    }
  }

  private async initializeOnce(): Promise<void> {
    this._unsubscribe = this._desktop.onPowerState((state) => this._state.set(state));
    try {
      this._state.set(await this._desktop.request('power.get', {}));
    } catch (cause) {
      this._notifications.showError(
        'Sleep prevention is unavailable.',
        cause instanceof Error ? cause.message : 'Symphony could not read its power settings.',
      );
    }
  }

  // #endregion
}
