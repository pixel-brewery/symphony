// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'runtimeDependencyIcon', standalone: true, pure: true })
export class RuntimeDependencyIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param id - Id.
   * @public
   */
  public transform(id: string): 'settings' | 'branch' | 'github' | 'sparkle' {
    if (id === 'homebrew') return 'settings';
    if (id === 'git') return 'branch';
    if (id === 'github-cli') return 'github';
    return 'sparkle';
  }

  // #endregion
}
