// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowRuntimeState } from '@symphony/domain-workflow';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IWorkflowRuntimeStatePresentation {
  readonly label: string;
  readonly variant: 'danger' | 'success' | 'warning' | 'highlight' | 'info';
}

/**
 * Names the runtime state beside the board column. The wording says why automation is or is
 * not progressing, because that is the question the state answers.
 */
@Pipe({ name: 'workflowRuntimeStatePresentation', standalone: true, pure: false })
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
        return {
          get label() {
            return translateLabel('loc.symphony.labels.waiting.6e293a8');
          },
          variant: 'info',
        };
      case 'awaiting-human-review':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.waiting.for.review.a61935d');
          },
          variant: 'warning',
        };
      case 'claimed':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.claimed.ddcd277');
          },
          variant: 'highlight',
        };
      case 'running':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.running.f4ccae2');
          },
          variant: 'highlight',
        };
      case 'retry-wait':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.retrying.f8fe6f8');
          },
          variant: 'warning',
        };
      case 'blocked':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.blocked.18f2a09');
          },
          variant: 'warning',
        };
      case 'human-required':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.needs.a.decision.11cbeb1');
          },
          variant: 'warning',
        };
      case 'quarantined':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.quarantined.bb132e0');
          },
          variant: 'danger',
        };
      case 'merge-pending':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.merging.a975de4');
          },
          variant: 'highlight',
        };
      case 'closed':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.closed.c21ead0');
          },
          variant: 'success',
        };
      case undefined:
        return {
          get label() {
            return translateLabel('loc.symphony.labels.not.tracked.4367a60');
          },
          variant: 'info',
        };
    }
  }

  // #endregion
}
