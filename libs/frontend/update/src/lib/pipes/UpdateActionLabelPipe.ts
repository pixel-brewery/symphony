// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';

// #endregion

@Pipe({ name: 'updateActionLabel', standalone: true, pure: true })
export class UpdateActionLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (state?.kind === 'ready') return `Restart and update to ${state.targetVersion}`;
    if (state?.kind === 'available') return `Download update ${state.targetVersion}`;
    if (state?.kind === 'checking') return 'Checking for updates…';
    if (state?.kind === 'downloading') return 'Downloading update…';
    return 'Check for updates';
  }

  // #endregion
}
