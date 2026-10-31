// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';

// #endregion

/**
 * Names the registered icon of an Inbox entry: what it waits for, or how its step ended.
 *
 * @public
 */
@Pipe({ name: 'inboxEntryIcon' })
export class InboxEntryIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Maps an entry to its icon.
   *
   * @param entry - The Inbox entry.
   * @returns A registered icon name.
   * @public
   */
  public transform(entry: Pick<IInboxEntry, 'kind' | 'executionState'>): string {
    switch (entry.kind) {
      case 'solution':
        return 'errorCircle';
      case 'acceptance':
        return 'checkCircle';
      case 'delivery-group':
        return 'clipboardTask';
      case 'failing-workflow':
        return 'warning';
      case 'merged-pull-request':
        return 'checkmarkCircle';
      case 'execution':
        switch (entry.executionState) {
          case 'succeeded':
            return 'checkmarkCircle';
          case 'failed':
            return 'errorCircle';
          case 'cancelled':
            return 'clear';
          default:
            return 'sync';
        }
    }
  }

  // #endregion
}
