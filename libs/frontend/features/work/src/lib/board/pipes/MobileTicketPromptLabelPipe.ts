// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileTicketAction } from '@symphony/mobile-contracts';

// #endregion

@Pipe({ name: 'mobileTicketPromptLabel', standalone: true, pure: true })
export class MobileTicketPromptLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param action - Action.
   * @public
   */
  public transform(action: MobileTicketAction | undefined): string {
    if (!action) return '';
    if (action.requiresFeedback) return 'Describe the requested changes';
    return action.kind === 'analyze' ? 'Guide the analysis' : 'Guide the solution';
  }

  // #endregion
}
