// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IWorkItemHealth } from '@symphony/domain-work';
import type { IWorkItemHealthPresentation } from './IWorkItemHealthPresentation';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** How many findings the tooltip names before it summarises the rest as a count. */
const tooltipIssueLimit = 3;

@Pipe({ name: 'workItemHealthPresentation', standalone: true, pure: false })
export class WorkItemHealthPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param health - Health.
   * @public
   */
  public transform(health: IWorkItemHealth | undefined): IWorkItemHealthPresentation | undefined {
    if (!health?.severity) return undefined;
    // Only the worst tier is named: a blocker and a missing planning field on the same card
    // are not equally urgent, and the card has room for one message.
    const reported = health.issues.filter((issue) => issue.severity === health.severity);
    const named = reported.slice(0, tooltipIssueLimit).map((issue) => issue.summary);
    const remaining = reported.length - named.length;
    const lines = remaining ? [...named, `and ${remaining} more`] : named;
    const blocker = health.severity === 'blocker';
    return {
      iconName: blocker ? 'errorCircle' : 'info',
      variant: blocker ? 'danger' : 'info',
      get tooltip() {
        return translateLabel(
          'loc.symphony.labels.open.the.item.for.details.12955e1',
          blocker ? 'Blocked' : 'Incomplete',
          lines.join(' · '),
        );
      },
      ariaLabel: `${blocker ? translateLabel('loc.symphony.labels.blocked.18f2a09') : translateLabel('loc.symphony.labels.incomplete.75f33cd')}: ${reported.length} ${
        reported.length === 1 ? 'issue' : 'issues'
      }`,
    };
  }

  // #endregion
}
