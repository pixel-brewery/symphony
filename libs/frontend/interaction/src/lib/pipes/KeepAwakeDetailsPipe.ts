// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PowerState } from '@symphony/ipc-contracts-desktop';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'keepAwakeDetails', standalone: true, pure: false })
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
      return translateLabel(
        'loc.symphony.labels.analysis.implementation.and.local.ci.runs.stop.when..51b5aa2',
        tasks,
      );
    }
    return state.engaged
      ? translateLabel(
          'loc.symphony.labels.the.display.may.still.turn.off.and.a.closed.lid.stil.5602ca3',
          tasks,
        )
      : translateLabel(
          'loc.symphony.labels.sleep.is.blocked.again.as.soon.as.the.next.task.star.47a4e0b',
          tasks,
        );
  }

  // #endregion
}
