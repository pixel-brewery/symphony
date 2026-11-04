// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IWorkItemIdentity {
  readonly externalId: string;
}

@Pipe({ name: 'executionDrawerTitle', standalone: true, pure: false })
export class ExecutionDrawerTitlePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @param workItem - Work item.
   * @public
   */
  public transform(
    execution: IExecutionRecord | undefined,
    workItem: IWorkItemIdentity | undefined,
  ): string {
    if (!execution) return translateLabel('loc.symphony.labels.execution.details.7b33ae0');
    const phase =
      execution.kind === 'revision'
        ? 'Revision'
        : execution.kind === 'solution'
          ? 'Implementation'
          : 'Analysis';
    return workItem ? `${workItem.externalId} · ${phase}` : phase;
  }

  // #endregion
}
