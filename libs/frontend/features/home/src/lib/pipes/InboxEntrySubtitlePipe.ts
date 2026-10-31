// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';

// #endregion

/**
 * Composes the one-line subtitle of an Inbox entry, shared by the Inbox list and Overview's
 * `Waiting for you`: the work item it concerns, or the branch and revision of a failed run.
 *
 * @public
 */
@Pipe({ name: 'inboxEntrySubtitle' })
export class InboxEntrySubtitlePipe implements PipeTransform {
  // #region Methods

  /**
   * Composes the subtitle.
   *
   * @param entry - The Inbox entry.
   * @returns The entry's subtitle.
   * @public
   */
  public transform(entry: IInboxEntry): string {
    switch (entry.kind) {
      case 'solution':
        return entry.workItem?.title ?? '';
      case 'failing-workflow':
        return [entry.branch, entry.revision?.slice(0, 7)].filter(Boolean).join(' · ');
      case 'merged-pull-request':
        return entry.workItem
          ? `${entry.workItem.externalId} · ${entry.workItem.title}`
          : (entry.pullRequestTitle ?? '');
      case 'acceptance':
      case 'delivery-group':
      case 'execution':
        return entry.workItem ? `${entry.workItem.externalId} · ${entry.workItem.title}` : '';
    }
  }

  // #endregion
}
