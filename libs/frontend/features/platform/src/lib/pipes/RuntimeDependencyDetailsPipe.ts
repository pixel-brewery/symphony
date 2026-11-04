// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IRuntimeHealth {
  readonly available: boolean;
  readonly version?: string;
}

@Pipe({ name: 'runtimeDependencyDetails', standalone: true, pure: false })
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
    return health.available
      ? version
        ? translateLabel('loc.symphony.labels.installed.c37cd08', version)
        : translateLabel('loc.symphony.labels.installed.f8b32f4')
      : translateLabel('loc.symphony.labels.not.installed.d177cdc');
  }

  // #endregion
}
