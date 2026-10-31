// #region Imports

import { type PowerState, powerStateSchema } from '@symphony/ipc-contracts-desktop';
import type { IKeepAwakeCoordinatorOptions } from './IKeepAwakeCoordinatorOptions';
import type { IPowerSaveBlocker } from './IPowerSaveBlocker';

// #endregion

export class KeepAwakeCoordinator {
  // #region Fields

  private readonly _blocker: IPowerSaveBlocker;
  private readonly _persist: (enabled: boolean) => void;
  private readonly _listeners = new Set<(state: PowerState) => void>();
  private _enabled: boolean;
  private _activeTaskCount = 0;
  private _blockerId?: number;

  // #endregion

  // #region Ctor

  public constructor(options: IKeepAwakeCoordinatorOptions) {
    this._blocker = options.blocker;
    this._persist = options.persist;
    this._enabled = options.enabled;
  }

  // #endregion

  // #region Methods

  /**
   * Snapshots.
   *
   * @public
   */
  public snapshot(): PowerState {
    return powerStateSchema.parse({
      keepAwakeWhileBusy: this._enabled,
      engaged: this._blockerId !== undefined,
      activeTaskCount: this._activeTaskCount,
    });
  }

  /**
   * Subscribes.
   *
   * @param listener - Listener.
   * @public
   */
  public subscribe(listener: (state: PowerState) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Sets whether Symphony keeps the machine awake while background tasks run.
   *
   * @param enabled - Enabled.
   * @public
   */
  public setEnabled(enabled: boolean): PowerState {
    if (this._enabled !== enabled) {
      this._enabled = enabled;
      this._persist(enabled);
    }
    return this.reconcile();
  }

  /**
   * Reports how many background tasks the orchestrator is currently running.
   *
   * @param count - Count.
   * @public
   */
  public reportActiveTasks(count: number): PowerState {
    this._activeTaskCount = Math.max(0, Math.trunc(count));
    return this.reconcile();
  }

  /**
   * Disposes.
   *
   * @public
   */
  public dispose(): void {
    this.releaseBlocker();
    this._listeners.clear();
  }

  // The blocker keeps the system awake but lets the display sleep: unattended runs need the
  // machine, not the screen. macOS still sleeps on lid close, which no assertion can override.
  private reconcile(): PowerState {
    const before = this.snapshot();
    if (this._enabled && this._activeTaskCount > 0) this.acquireBlocker();
    else this.releaseBlocker();
    const state = this.snapshot();
    if (
      before.keepAwakeWhileBusy === state.keepAwakeWhileBusy &&
      before.engaged === state.engaged &&
      before.activeTaskCount === state.activeTaskCount
    ) {
      return state;
    }
    for (const listener of this._listeners) listener(state);
    return state;
  }

  private acquireBlocker(): void {
    if (this._blockerId !== undefined && this._blocker.isStarted(this._blockerId)) return;
    this._blockerId = this._blocker.start('prevent-app-suspension');
  }

  private releaseBlocker(): void {
    if (this._blockerId === undefined) return;
    const id = this._blockerId;
    this._blockerId = undefined;
    if (this._blocker.isStarted(id)) this._blocker.stop(id);
  }

  // #endregion
}
