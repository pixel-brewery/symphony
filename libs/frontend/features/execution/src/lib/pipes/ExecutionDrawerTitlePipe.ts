// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

interface IWorkItemIdentity {
  readonly externalId: string;
}

@Pipe({ name: 'executionDrawerTitle', standalone: true, pure: true })
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
    if (!execution) return 'Execution details';
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
