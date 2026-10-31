// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'positionAuthorityLabel', standalone: true, pure: true })
export class PositionAuthorityLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param authority - Authority.
   * @public
   */
  public transform(authority: string): string {
    return authority === 'read-only' ? 'Read only' : 'Worktree write access';
  }

  // #endregion
}
