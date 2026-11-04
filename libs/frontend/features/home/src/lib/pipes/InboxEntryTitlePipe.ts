// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Composes the title of an Inbox entry, shared by the Inbox list and Overview's `Waiting for
 * you`: `Choose how CR-0589 continues`, `Review delivered work`, `Deploy Dev failed twice`,
 * `Codex started implementation`, `PR #705 merged`.
 *
 * @public
 */
@Pipe({ pure: false, name: 'inboxEntryTitle' })
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
        return translateLabel(
          'loc.symphony.labels.choose.how.continues.7012abc',
          entry.workItem?.externalId ?? 'this work item',
        );
      case 'acceptance':
        return translateLabel('loc.symphony.labels.review.delivered.work.dd55f66');
      case 'delivery-group':
        return translateLabel(
          'loc.symphony.labels.deliver.work.items.together.4c818b7',
          entry.workItemCount ?? 0,
        );
      case 'failing-workflow': {
        const streak = entry.failureStreak ?? 1;
        const name = entry.workflowName ?? 'A workflow';
        if (streak <= 1) return translateLabel('loc.symphony.labels.failed.d5de6f7', name);
        return streak === 2
          ? translateLabel('loc.symphony.labels.failed.twice.4a1d667', name)
          : translateLabel('loc.symphony.labels.failed.times.713626d', name, streak);
      }
      case 'merged-pull-request':
        return translateLabel(
          'loc.symphony.labels.pr.merged.31957b4',
          entry.pullRequestNumber ?? '?',
        );
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
            return entry.manual
              ? translateLabel('loc.symphony.labels.you.recorded.66d7635', step)
              : translateLabel('loc.symphony.labels.finished.bbe1427', actor, step);
          case 'failed':
            return translateLabel('loc.symphony.labels.could.not.finish.29d3c6e', actor, step);
          case 'cancelled':
          case 'waiting':
            return translateLabel('loc.symphony.labels.paused.044b08e', actor, step);
          default:
            return translateLabel('loc.symphony.labels.started.86fca30', actor, step);
        }
      }
    }
  }

  // #endregion
}
