// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/** Read-only Arcade test-mode state supplied to its feature views. @public */
export interface IArcadeGodModeState {
  /** Keyboard labels in activation order. @public @readonly */
  readonly sequence: readonly string[];
  /** Number of accepted keys currently shown as complete. @public @readonly */
  readonly progress: Signal<number>;
  /** Whether the one-way renderer-session mode has been activated. @public @readonly */
  readonly enabled: Signal<boolean>;
}
