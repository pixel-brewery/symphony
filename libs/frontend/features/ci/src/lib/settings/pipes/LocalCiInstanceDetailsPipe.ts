// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { LocalCiInstanceDto } from '@symphony/ipc-contracts-ci';
import { storageSize } from '@symphony/frontend-ui';

// #endregion

/**
 * One line describing a machine: why it is still there, followed by what it costs. A machine
 * kept on purpose and one an interrupted teardown abandoned look identical on disk, so the
 * reason has to be spelled out before the numbers.
 */
@Pipe({ name: 'localCiInstanceDetails', standalone: true, pure: true })
export class LocalCiInstanceDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param instance - Instance.
   * @public
   */
  public transform(instance: LocalCiInstanceDto): string {
    const parts = [instance.name, state(instance)];
    parts.push(
      instance.provisionedDiskGiB
        ? `${storageSize(instance.allocatedBytes)} of ${instance.provisionedDiskGiB} GB`
        : storageSize(instance.allocatedBytes),
    );
    return parts.join(' · ');
  }

  // #endregion
}

function state(instance: LocalCiInstanceDto): string {
  if (instance.busy) return 'in use by the current run';
  if (instance.keptWarm) return 'kept warm for the next run';
  if (instance.status === 'running') return 'running without a Symphony run';
  if (instance.status === 'missing') return 'left behind, no longer tracked';
  return 'stopped, removable';
}
