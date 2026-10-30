// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'actionStateLabel', standalone: true, pure: true })
export class ActionStateLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: string): string {
    if (state === 'in-progress') return 'In progress';
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  // #endregion
}
