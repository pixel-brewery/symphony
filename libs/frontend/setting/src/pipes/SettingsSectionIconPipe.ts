// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { SettingsSection } from '../models/SettingsSection';

// #endregion

/**
 * Maps a Settings section to the icon of its sidebar row.
 *
 * @public
 */
@Pipe({ name: 'settingsSectionIcon' })
export class SettingsSectionIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the registered icon name of a section.
   *
   * @param section - Section identifier.
   * @returns The icon name.
   * @public
   */
  public transform(section: SettingsSection['id']): string {
    switch (section) {
      case 'workspaces':
        return 'folder';
      case 'automation':
        return 'sync';
      case 'skills':
        return 'skills';
      case 'system':
        return 'settings';
      case 'mobile':
        return 'cloudArrowRight';
      case 'appearance':
        return 'weatherSunny';
      case 'team':
        return 'bot';
      case 'services':
        return 'disconnect';
      case 'repositories':
        return 'branch';
      case 'delivery':
        return 'flow';
      case 'local-ci':
        return 'executionOutline';
      case 'administration':
        return 'clipboardTask';
    }
  }

  // #endregion
}
