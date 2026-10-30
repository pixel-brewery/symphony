// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowRuntimeState } from '@symphony/domain-workflow';

// #endregion

interface IWorkflowRuntimeStatePresentation {
  readonly label: string;
  readonly variant: 'danger' | 'success' | 'warning' | 'highlight' | 'info';
}

/**
 * Names the runtime state beside the board column. The wording says why automation is or is
 * not progressing, because that is the question the state answers.
 */
@Pipe({ name: 'workflowRuntimeStatePresentation', standalone: true, pure: true })
export class WorkflowRuntimeStatePresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: WorkflowRuntimeState | undefined): IWorkflowRuntimeStatePresentation {
    switch (state) {
      case 'idle':
        return { label: 'Waiting', variant: 'info' };
      case 'awaiting-human-review':
        return { label: 'Waiting for review', variant: 'warning' };
      case 'claimed':
        return { label: 'Claimed', variant: 'highlight' };
      case 'running':
        return { label: 'Running', variant: 'highlight' };
      case 'retry-wait':
        return { label: 'Retrying', variant: 'warning' };
      case 'blocked':
        return { label: 'Blocked', variant: 'warning' };
      case 'human-required':
        return { label: 'Needs a decision', variant: 'warning' };
      case 'quarantined':
        return { label: 'Quarantined', variant: 'danger' };
      case 'merge-pending':
        return { label: 'Merging', variant: 'highlight' };
      case 'closed':
        return { label: 'Closed', variant: 'success' };
      case undefined:
        return { label: 'Not tracked', variant: 'info' };
    }
  }

  // #endregion
}
