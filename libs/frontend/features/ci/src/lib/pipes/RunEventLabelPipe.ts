// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names what triggered a run in a few words: `push`, `manual`, `pull request`, `scheduled`.
 *
 * @public
 */
@Pipe({ name: 'runEventLabel', standalone: true, pure: false })
export class RunEventLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Resolves the trigger name.
   *
   * @param event - Provider event name.
   * @returns The visible trigger.
   * @public
   */
  public transform(event: string | undefined): string {
    switch (event) {
      case undefined:
      case '':
        return '';
      case 'workflow_dispatch':
        return translateLabel('loc.symphony.labels.manual.36bde66');
      case 'pull_request':
      case 'pull_request_target':
        return translateLabel('loc.symphony.labels.pull.request.763fae5');
      case 'schedule':
        return translateLabel('loc.symphony.labels.scheduled.6aef76c');
      case 'merge_group':
        return translateLabel('loc.symphony.labels.merge.queue.81b65f0');
      default:
        return event.replaceAll('_', ' ');
    }
  }

  // #endregion
}
