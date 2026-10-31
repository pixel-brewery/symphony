// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileTicketAction } from '@symphony/mobile-contracts';

// #endregion

type ActionVariant = 'highlight' | 'primary' | 'default' | 'danger' | 'success';

/**
 * Emphasis for one offered step. The desktop board gives its menu the same hierarchy from the
 * same fields, so a gate reads the same on both surfaces: one accented way on, a marked way out.
 */
@Pipe({ name: 'mobileTicketActionVariant', standalone: true, pure: true })
export class MobileTicketActionVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param action - Action.
   * @public
   */
  public transform(action: MobileTicketAction | undefined): ActionVariant {
    switch (action?.kind) {
      case 'cancel':
      case 'dequeue':
        return 'danger';
      case 'publish-pull-request':
        return 'success';
      case 'decide':
        if (action.effect === 'advance') return 'highlight';
        return action.effect === 'close' ? 'danger' : 'default';
      default:
        return action?.repeat ? 'highlight' : 'primary';
    }
  }

  // #endregion
}
