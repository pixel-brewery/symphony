// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';

// #endregion

/**
 * Chooses the status colour of an Inbox entry's icon; the icon always comes with its title.
 *
 * @public
 */
@Pipe({ name: 'inboxEntryVariant' })
export class InboxEntryVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Maps an entry to its icon variant.
   *
   * @param entry - The Inbox entry.
   * @returns A Mosaik variant.
   * @public
   */
  public transform(
    entry: Pick<IInboxEntry, 'kind' | 'executionState'>,
  ): 'default' | 'danger' | 'warning' | 'success' {
    switch (entry.kind) {
      case 'solution':
        return 'danger';
      case 'failing-workflow':
        return 'warning';
      case 'merged-pull-request':
        return 'success';
      case 'execution':
        return entry.executionState === 'succeeded'
          ? 'success'
          : entry.executionState === 'failed'
            ? 'danger'
            : 'default';
      case 'acceptance':
      case 'delivery-group':
        return 'default';
    }
  }

  // #endregion
}
