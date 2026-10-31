// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'settingName', standalone: true, pure: true })
export class SettingNamePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param value - Value.
   * @public
   */
  public transform(value: string): string {
    const normalized = value.replaceAll('_', ' ').replaceAll('-', ' ').trim();
    if (normalized.toLocaleLowerCase() === 'opencode') return 'OpenCode';
    return normalized ? `${normalized[0]?.toUpperCase()}${normalized.slice(1)}` : value;
  }

  // #endregion
}
