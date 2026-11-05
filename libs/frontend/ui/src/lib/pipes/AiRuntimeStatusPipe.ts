// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IRuntimeHealth {
  readonly available: boolean;
  readonly version?: string;
}

@Pipe({ name: 'aiRuntimeStatus', standalone: true, pure: false })
export class AiRuntimeStatusPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param health - Health.
   * @public
   */
  public transform(health: IRuntimeHealth | undefined): string {
    if (!health) return translateLabel('loc.symphony.labels.checking.local.cli.c46b886');
    return health.available
      ? translateLabel(
          'loc.symphony.labels.cli.ready.4b29fcf',
          health.version ? ` · ${health.version}` : '',
        )
      : translateLabel('loc.symphony.labels.cli.must.be.installed.first.c0fff7f');
  }

  // #endregion
}
