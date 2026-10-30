// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PowerState } from '@symphony/ipc-contracts-desktop';

// #endregion

@Pipe({ name: 'keepAwakeDetails', standalone: true, pure: true })
export class KeepAwakeDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: PowerState | undefined): string {
    if (!state) return '';
    const tasks = `${state.activeTaskCount} running ${state.activeTaskCount === 1 ? 'task' : 'tasks'}`;
    if (!state.keepAwakeWhileBusy) {
      return `Analysis, implementation, and local CI runs stop when macOS sleeps · ${tasks}`;
    }
    return state.engaged
      ? `The display may still turn off, and a closed lid still sleeps · ${tasks}`
      : `Sleep is blocked again as soon as the next task starts · ${tasks}`;
  }

  // #endregion
}
