// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { LocalCiResourcePresetName } from '@symphony/domain-ci';

// #endregion

@Pipe({ name: 'localCiPresetLabel', standalone: true, pure: true })
export class LocalCiPresetLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param preset - Preset.
   * @public
   */
  public transform(preset: LocalCiResourcePresetName): string {
    return preset.charAt(0).toUpperCase() + preset.slice(1);
  }

  // #endregion
}
