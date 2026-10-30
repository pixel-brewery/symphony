// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { WorkflowAuditKind } from '@symphony/domain-workflow';

// #endregion

interface IWorkflowAuditPresentation {
  readonly icon: string;
  readonly variant: 'danger' | 'success' | 'warning' | 'highlight' | 'info';
}

/** Marker for one history entry, so a failure is recognizable without reading the text. */
@Pipe({ name: 'workflowAuditPresentation', standalone: true, pure: true })
export class WorkflowAuditPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param kind - Kind.
   * @public
   */
  public transform(kind: WorkflowAuditKind): IWorkflowAuditPresentation {
    switch (kind) {
      case 'stage-changed':
        return { icon: 'flow', variant: 'highlight' };
      case 'run-reported':
        return { icon: 'checkmark', variant: 'success' };
      case 'human-decided':
        return { icon: 'person', variant: 'info' };
      case 'retry-scheduled':
        return { icon: 'sync', variant: 'warning' };
      case 'resumed':
        return { icon: 'sync', variant: 'success' };
      case 'blocked':
        return { icon: 'disconnect', variant: 'warning' };
      case 'escalated':
        return { icon: 'info', variant: 'warning' };
      case 'quarantined':
        return { icon: 'errorCircle', variant: 'danger' };
      case 'closed':
        return { icon: 'checkmark', variant: 'success' };
      case 'guard-rejected':
        return { icon: 'error', variant: 'danger' };
    }
  }

  // #endregion
}
