// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowTransitionTrigger } from '@symphony/domain-workflow';

// #endregion

/** Names what makes a transition fire, in the vocabulary the process document uses. */
@Pipe({ name: 'workflowTriggerLabel' })
export class WorkflowTriggerLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param trigger - Trigger.
   * @public
   */
  public transform(trigger: WorkflowTransitionTrigger): string {
    switch (trigger.kind) {
      case 'outcome':
        return `${trigger.role} · ${trigger.outcome}`;
      case 'claim':
        return `claim · ${trigger.role}`;
      case 'decision':
        return trigger.optionId;
      case 'reconciliation':
        return 'reconciliation';
    }
  }

  // #endregion
}
