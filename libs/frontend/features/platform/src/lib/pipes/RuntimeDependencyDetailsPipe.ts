// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IRuntimeHealth {
  readonly available: boolean;
  readonly version?: string;
}

@Pipe({ name: 'runtimeDependencyDetails', standalone: true, pure: true })
export class RuntimeDependencyDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param health - Health.
   * @public
   */
  public transform(health: IRuntimeHealth): string {
    const version = health.version?.split(/\r?\n/u)[0]?.trim();
    return health.available ? (version ? `Installed · ${version}` : 'Installed') : 'Not installed';
  }

  // #endregion
}
