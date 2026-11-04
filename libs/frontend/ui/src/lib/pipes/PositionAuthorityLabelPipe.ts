// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'positionAuthorityLabel', standalone: true, pure: false })
export class PositionAuthorityLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param authority - Authority.
   * @public
   */
  public transform(authority: string): string {
    return authority === 'read-only'
      ? translateLabel('loc.symphony.labels.read.only.8ac7673')
      : translateLabel('loc.symphony.labels.worktree.write.access.b9688be');
  }

  // #endregion
}
