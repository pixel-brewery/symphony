// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ActionRunner } from '../actions/view-presenters/actionsOverview/ActionRunner';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names where a run executed: `GitHub`, `Local runner` or `GitHub + local`.
 *
 * @public
 */
@Pipe({ name: 'actionRunnerLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.local.runner.eef4f85');
      case 'github-local':
        return translateLabel('loc.symphony.labels.github.local.64c0458');
    }
  }

  // #endregion
}
