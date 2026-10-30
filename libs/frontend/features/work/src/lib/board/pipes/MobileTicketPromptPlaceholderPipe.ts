// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileTicketAction } from '@symphony/mobile-contracts';

// #endregion

@Pipe({ name: 'mobileTicketPromptPlaceholder', standalone: true, pure: true })
export class MobileTicketPromptPlaceholderPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param action - Action.
   * @public
   */
  public transform(action: MobileTicketAction | undefined): string {
    if (!action) return '';
    return action.requiresFeedback
      ? 'What should the Solver change in the existing solution?'
      : 'Add optional context, constraints or a specific focus…';
  }

  // #endregion
}
