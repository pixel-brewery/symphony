// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ILocalCiResourceLimits, LocalCiResourcePresetName } from '@symphony/domain-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IResolvedPreset {
  readonly supported: boolean;
  readonly resources: ILocalCiResourceLimits;
}

@Pipe({ name: 'localCiPresetOptionLabel', standalone: true, pure: false })
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
    if (!preset) return translateLabel('loc.symphony.labels.measuring.this.mac.cd74e2c', label);
    if (!preset.supported)
      return translateLabel('loc.symphony.labels.unavailable.on.this.mac.102719c', label);
    const resources = preset.resources;
    return translateLabel(
      'loc.symphony.labels.cpus.gb.memory.gb.disk.gb.cache.722f2ea',
      label,
      resources.cpus,
      resources.memoryGiB,
      resources.diskGiB,
      resources.cacheGiB,
    );
  }

  // #endregion
}
