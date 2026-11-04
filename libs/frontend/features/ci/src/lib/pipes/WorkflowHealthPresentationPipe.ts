// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowHealth } from '../actions/view-presenters/actionsOverview/WorkflowHealth';
import type { IWorkflowHealthPresentation } from './IWorkflowHealthPresentation';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Maps a workflow's health to its dot in the `WORKFLOWS` list.
 *
 * @public
 */
@Pipe({ name: 'workflowHealthPresentation', standalone: true, pure: false })
export class WorkflowHealthPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Resolves the dot.
   *
   * @param health - Workflow health.
   * @returns Variant and label.
   * @public
   */
  public transform(health: WorkflowHealth): IWorkflowHealthPresentation {
    switch (health) {
      case 'failing':
        return {
          variant: 'danger',
          get label() {
            return translateLabel('loc.symphony.labels.latest.run.failed.f774e4d');
          },
        };
      case 'running':
        return {
          variant: 'neutral',
          get label() {
            return translateLabel('loc.symphony.labels.running.f4ccae2');
          },
        };
      case 'passing':
        return {
          variant: 'success',
          get label() {
            return translateLabel('loc.symphony.labels.latest.run.passed.467f1da');
          },
        };
      case 'idle':
        return {
          variant: 'neutral',
          get label() {
            return translateLabel('loc.symphony.labels.no.finished.run.fe51380');
          },
        };
    }
  }

  // #endregion
}
