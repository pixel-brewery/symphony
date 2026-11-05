// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ILocalCiResourceLimits } from '@symphony/domain-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IResolvedPreset {
  readonly supported: boolean;
  readonly unavailableReason?: string;
  readonly resources: ILocalCiResourceLimits;
}

@Pipe({ name: 'localCiPresetDetails', standalone: true, pure: false })
export class LocalCiPresetDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param preset - Preset.
   * @public
   */
  public transform(preset: IResolvedPreset | undefined): string {
    if (!preset) return translateLabel('loc.symphony.labels.measuring.this.mac.3ea7b73');
    if (!preset.supported) return preset.unavailableReason ?? 'Unavailable on this Mac';
    const resources = preset.resources;
    return translateLabel(
      'loc.symphony.labels.cpus.gb.memory.gb.maximum.virtual.disk.gb.shared.cac.d3172cb',
      resources.cpus,
      resources.memoryGiB,
      resources.diskGiB,
      resources.cacheGiB,
    );
  }

  // #endregion
}
