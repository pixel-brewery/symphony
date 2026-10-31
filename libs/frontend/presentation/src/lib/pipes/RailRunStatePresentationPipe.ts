// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IRailRunStatePresentation {
  readonly icon: 'checkmark' | 'errorCircle' | 'clear' | 'executionOutline';
  readonly variant: 'success' | 'danger' | 'warning' | 'neutral' | 'primary';
}

@Pipe({ name: 'railRunStatePresentation', standalone: true, pure: true })
export class RailRunStatePresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: string): IRailRunStatePresentation {
    if (state === 'succeeded') return { icon: 'checkmark', variant: 'success' };
    if (state === 'failed') return { icon: 'errorCircle', variant: 'danger' };
    if (state === 'cancelled') return { icon: 'clear', variant: 'warning' };
    // A step that only waits for a slot is neither work in progress nor a problem.
    if (state === 'queued') return { icon: 'executionOutline', variant: 'neutral' };
    return { icon: 'executionOutline', variant: 'primary' };
  }

  // #endregion
}
