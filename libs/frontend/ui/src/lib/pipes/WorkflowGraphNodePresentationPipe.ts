// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IWorkflowGraphNode } from '@symphony/domain-workflow';

// #endregion

/** Maps the provider-neutral process state to public Mosaik semantics. */
@Pipe({ name: 'workflowGraphNodePresentation', standalone: true, pure: true })
export class WorkflowGraphNodePresentationPipe implements PipeTransform {
  // #region Methods

  /** @public */
  public transform(node: IWorkflowGraphNode): {
    readonly icon: string;
    readonly variant: 'primary' | 'success' | 'warning' | 'neutral';
  } {
    return {
      icon: node.kind === 'automated' ? 'bot' : node.kind === 'human-gate' ? 'person' : 'checkmark',
      variant:
        node.state === 'current'
          ? 'primary'
          : node.state === 'unreachable'
            ? 'warning'
            : node.state === 'visited'
              ? 'success'
              : 'neutral',
    };
  }

  // #endregion
}
