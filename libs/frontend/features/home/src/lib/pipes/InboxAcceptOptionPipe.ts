// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import type { InboxOption } from '../inbox/InboxOption';
import { isAcceptanceOption } from '../inbox/isAcceptanceOption';

// #endregion

/**
 * Picks the continuation that accepts an entry's delivered work, which the Inbox list offers
 * right on the entry.
 *
 * @public
 */
@Pipe({ name: 'inboxAcceptOption' })
export class InboxAcceptOptionPipe implements PipeTransform {
  // #region Methods

  /**
   * Finds the accepting continuation.
   *
   * @param entry - The Inbox entry.
   * @returns The accepting continuation of delivered work, if any.
   * @public
   */
  public transform(entry: IInboxEntry): InboxOption | undefined {
    return entry.kind === 'acceptance' ? entry.options.find(isAcceptanceOption) : undefined;
  }

  // #endregion
}
