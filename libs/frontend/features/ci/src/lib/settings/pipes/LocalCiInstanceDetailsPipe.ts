// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { LocalCiInstanceDto } from '@symphony/ipc-contracts-ci';
import { storageSize } from '@symphony/frontend-ui';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * One line describing a machine: why it is still there, followed by what it costs. A machine
 * kept on purpose and one an interrupted teardown abandoned look identical on disk, so the
 * reason has to be spelled out before the numbers.
 */
@Pipe({ name: 'localCiInstanceDetails', standalone: true, pure: false })
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
  if (instance.busy) return translateLabel('loc.symphony.labels.in.use.by.the.current.run.30c6a82');
  if (instance.keptWarm)
    return translateLabel('loc.symphony.labels.kept.warm.for.the.next.run.a59005b');
  if (instance.status === 'running')
    return translateLabel('loc.symphony.labels.running.without.a.symphony.run.5e8f912');
  if (instance.status === 'missing')
    return translateLabel('loc.symphony.labels.left.behind.no.longer.tracked.5c10024');
  return translateLabel('loc.symphony.labels.stopped.removable.7edd2ba');
}
