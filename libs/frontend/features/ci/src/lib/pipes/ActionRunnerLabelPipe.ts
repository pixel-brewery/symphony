// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ActionRunner } from '../actions/view-presenters/actionsOverview/ActionRunner';

// #endregion

/**
 * Names where a run executed: `GitHub`, `Local runner` or `GitHub + local`.
 *
 * @public
 */
@Pipe({ name: 'actionRunnerLabel', standalone: true, pure: true })
export class ActionRunnerLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Resolves the runner name.
   *
   * @param runner - Runner.
   * @returns The visible name.
   * @public
   */
  public transform(runner: ActionRunner): string {
    switch (runner) {
      case 'github':
        return 'GitHub';
      case 'local':
        return 'Local runner';
      case 'github-local':
        return 'GitHub + local';
    }
  }

  // #endregion
}
