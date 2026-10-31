// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Shortens a full commit hash to its first seven characters, the way GitHub shows it; other
 * revisions stay as they are.
 *
 * @public
 */
@Pipe({ name: 'shortRevision', standalone: true, pure: true })
export class ShortRevisionPipe implements PipeTransform {
  // #region Methods

  /**
   * Shortens the revision.
   *
   * @param revision - Commit hash or other revision.
   * @returns The short form.
   * @public
   */
  public transform(revision: string | undefined): string {
    if (!revision) return '';
    return /^[0-9a-f]{40}$/iu.test(revision) ? revision.slice(0, 7) : revision;
  }

  // #endregion
}
