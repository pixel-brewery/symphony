// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ILocalCiResourceLimits } from '@symphony/domain-ci';

// #endregion

interface IResolvedPreset {
  readonly supported: boolean;
  readonly unavailableReason?: string;
  readonly resources: ILocalCiResourceLimits;
}

@Pipe({ name: 'localCiPresetDetails', standalone: true, pure: true })
export class LocalCiPresetDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param preset - Preset.
   * @public
   */
  public transform(preset: IResolvedPreset | undefined): string {
    if (!preset) return 'Measuring this Mac…';
    if (!preset.supported) return preset.unavailableReason ?? 'Unavailable on this Mac';
    const resources = preset.resources;
    return `${resources.cpus} CPUs · ${resources.memoryGiB} GB memory · ${resources.diskGiB} GB maximum virtual disk · ${resources.cacheGiB} GB shared cache`;
  }

  // #endregion
}
