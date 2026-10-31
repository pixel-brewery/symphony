// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowHealth } from '../actions/view-presenters/actionsOverview/WorkflowHealth';
import type { IWorkflowHealthPresentation } from './IWorkflowHealthPresentation';

// #endregion

/**
 * Maps a workflow's health to its dot in the `WORKFLOWS` list.
 *
 * @public
 */
@Pipe({ name: 'workflowHealthPresentation', standalone: true, pure: true })
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
        return { variant: 'danger', label: 'Latest run failed' };
      case 'running':
        return { variant: 'neutral', label: 'Running' };
      case 'passing':
        return { variant: 'success', label: 'Latest run passed' };
      case 'idle':
        return { variant: 'neutral', label: 'No finished run' };
    }
  }

  // #endregion
}
