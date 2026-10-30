// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { LocalCiInstanceDto } from '@symphony/ipc-contracts-ci';

// #endregion

/** Names what a managed machine was created for, so a row is readable without its hashed name. */
@Pipe({ name: 'localCiInstanceLabel', standalone: true, pure: true })
export class LocalCiInstanceLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param instance - Instance.
   * @public
   */
  public transform(instance: LocalCiInstanceDto): string {
    switch (instance.purpose) {
      case 'workflow-runner':
        return 'Workflow runner';
      default:
        return 'Machine from an earlier version';
    }
  }

  // #endregion
}
