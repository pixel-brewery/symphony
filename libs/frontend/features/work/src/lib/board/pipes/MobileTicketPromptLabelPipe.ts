// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileTicketAction } from '@symphony/mobile-contracts';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'mobileTicketPromptLabel', standalone: true, pure: false })
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
    if (action.requiresFeedback)
      return translateLabel('loc.symphony.labels.describe.the.requested.changes.c2c5852');
    return action.kind === 'analyze'
      ? translateLabel('loc.symphony.labels.guide.the.analysis.2a63900')
      : translateLabel('loc.symphony.labels.guide.the.solution.1e1f9bd');
  }

  // #endregion
}
