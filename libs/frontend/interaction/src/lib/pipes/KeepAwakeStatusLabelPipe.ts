// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PowerState } from '@symphony/ipc-contracts-desktop';

// #endregion

@Pipe({ name: 'keepAwakeStatusLabel', standalone: true, pure: true })
export class KeepAwakeStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: PowerState | undefined): string {
    if (!state) return 'Sleep status is unavailable.';
    if (!state.keepAwakeWhileBusy) return 'This Mac may sleep while Symphony works.';
    return state.engaged
      ? 'Sleep is blocked while tasks are running.'
      : 'Sleep is allowed while Symphony is idle.';
  }

  // #endregion
}
