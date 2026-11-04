// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PowerState } from '@symphony/ipc-contracts-desktop';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'keepAwakeStatusLabel', standalone: true, pure: false })
export class KeepAwakeStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: PowerState | undefined): string {
    if (!state) return translateLabel('loc.symphony.labels.sleep.status.is.unavailable.4ade33a');
    if (!state.keepAwakeWhileBusy)
      return translateLabel('loc.symphony.labels.this.mac.may.sleep.while.symphony.works.2a0fe08');
    return state.engaged
      ? translateLabel('loc.symphony.labels.sleep.is.blocked.while.tasks.are.running.90977c3')
      : translateLabel('loc.symphony.labels.sleep.is.allowed.while.symphony.is.idle.3d6c8a4');
  }

  // #endregion
}
