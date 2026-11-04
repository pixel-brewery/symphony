// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'actionStateLabel', standalone: true, pure: false })
export class ActionStateLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: string): string {
    if (state === 'in-progress') return translateLabel('loc.symphony.labels.in.progress.c1f88e9');
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  // #endregion
}
