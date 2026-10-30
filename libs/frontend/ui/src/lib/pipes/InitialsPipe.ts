// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'initials', standalone: true, pure: true })
export class InitialsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param value - Value.
   * @public
   */
  public transform(value: string): string {
    return value
      .split(/\s+/u)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toLocaleUpperCase();
  }

  // #endregion
}
