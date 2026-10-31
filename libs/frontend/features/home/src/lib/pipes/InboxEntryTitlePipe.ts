// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';

// #endregion

/**
 * Composes the title of an Inbox entry, shared by the Inbox list and Overview's `Waiting for
 * you`: `Choose how CR-0589 continues`, `Review delivered work`, `Deploy Dev failed twice`,
 * `Codex started implementation`, `PR #705 merged`.
 *
 * @public
 */
@Pipe({ name: 'inboxEntryTitle' })
export class InboxEntryTitlePipe implements PipeTransform {
  // #region Methods

  /**
   * Composes the title.
   *
   * @param entry - The Inbox entry.
   * @returns The entry's title.
   * @public
   */
  public transform(entry: IInboxEntry): string {
    switch (entry.kind) {
      case 'solution':
        return `Choose how ${entry.workItem?.externalId ?? 'this work item'} continues`;
      case 'acceptance':
        return 'Review delivered work';
      case 'delivery-group':
        return `Deliver ${entry.workItemCount ?? 0} work items together?`;
      case 'failing-workflow': {
        const streak = entry.failureStreak ?? 1;
        const name = entry.workflowName ?? 'A workflow';
        if (streak <= 1) return `${name} failed`;
        return streak === 2 ? `${name} failed twice` : `${name} failed ${streak} times`;
      }
      case 'merged-pull-request':
        return `PR #${entry.pullRequestNumber ?? '?'} merged`;
      case 'execution': {
        const actor = entry.manual ? 'You' : (entry.agentName ?? 'An agent');
        const step =
          entry.executionKind === 'analysis'
            ? 'the analysis'
            : entry.executionKind === 'revision'
              ? 'a revision'
              : 'implementation';
        switch (entry.executionState) {
          case 'succeeded':
            return entry.manual ? `You recorded ${step}` : `${actor} finished ${step}`;
          case 'failed':
            return `${actor} could not finish ${step}`;
          case 'cancelled':
          case 'waiting':
            return `${actor} paused ${step}`;
          default:
            return `${actor} started ${step}`;
        }
      }
    }
  }

  // #endregion
}
