// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ILocalCiResourceLimits, LocalCiResourcePresetName } from '@symphony/domain-ci';

// #endregion

interface IResolvedPreset {
  readonly supported: boolean;
  readonly resources: ILocalCiResourceLimits;
}

@Pipe({ name: 'localCiPresetOptionLabel', standalone: true, pure: true })
export class LocalCiPresetOptionLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param name - Name.
   * @param preset - Preset.
   * @public
   */
  public transform(name: LocalCiResourcePresetName, preset: IResolvedPreset | undefined): string {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    if (!preset) return `${label} - measuring this Mac`;
    if (!preset.supported) return `${label} - unavailable on this Mac`;
    const resources = preset.resources;
    return `${label} - ${resources.cpus} CPUs, ${resources.memoryGiB} GB memory, ${resources.diskGiB} GB disk, ${resources.cacheGiB} GB cache`;
  }

  // #endregion
}
