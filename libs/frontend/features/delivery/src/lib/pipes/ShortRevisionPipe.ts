// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const abbreviatedLength = 7;

/** Abbreviates a commit revision the way Git and GitHub display it. */
@Pipe({ name: 'shortRevision', standalone: true, pure: true })
export class ShortRevisionPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param revision - Revision.
   * @public
   */
  public transform(revision: string): string {
    return revision.length > abbreviatedLength ? revision.slice(0, abbreviatedLength) : revision;
  }

  // #endregion
}
