// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Names what triggered a run in a few words: `push`, `manual`, `pull request`, `scheduled`.
 *
 * @public
 */
@Pipe({ name: 'runEventLabel', standalone: true, pure: true })
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
        return 'manual';
      case 'pull_request':
      case 'pull_request_target':
        return 'pull request';
      case 'schedule':
        return 'scheduled';
      case 'merge_group':
        return 'merge queue';
      default:
        return event.replaceAll('_', ' ');
    }
  }

  // #endregion
}
