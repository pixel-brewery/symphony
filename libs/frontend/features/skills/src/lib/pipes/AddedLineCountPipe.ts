// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Counts the lines a person added to a built-in role's instructions, ignoring blank lines.
 *
 * @public
 */
@Pipe({ name: 'addedLineCount', standalone: true, pure: true })
export class AddedLineCountPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms additional instructions into their number of non-blank lines.
   *
   * @param instructions - The additional instructions.
   * @public
   */
  public transform(instructions: string): number {
    return instructions.split(/\r?\n/u).filter((line) => line.trim()).length;
  }

  // #endregion
}
