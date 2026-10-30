// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';

// #endregion

@Pipe({ name: 'updateDetails', standalone: true, pure: true })
export class UpdateDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (!state) return '';
    const checked = state.lastCheckedAt
      ? ` · Checked ${new Intl.DateTimeFormat(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(state.lastCheckedAt))}`
      : '';
    return `Current version ${state.currentVersion} · ${state.channel} channel${checked}`;
  }

  // #endregion
}
