// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { LocalCiInstanceDto } from '@symphony/ipc-contracts-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Names what a managed machine was created for, so a row is readable without its hashed name. */
@Pipe({ name: 'localCiInstanceLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.workflow.runner.ad54a80');
      default:
        return translateLabel('loc.symphony.labels.machine.from.an.earlier.version.3b1d029');
    }
  }

  // #endregion
}
