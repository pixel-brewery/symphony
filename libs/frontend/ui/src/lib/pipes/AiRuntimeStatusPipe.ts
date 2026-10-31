// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IRuntimeHealth {
  readonly available: boolean;
  readonly version?: string;
}

@Pipe({ name: 'aiRuntimeStatus', standalone: true, pure: true })
export class AiRuntimeStatusPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param health - Health.
   * @public
   */
  public transform(health: IRuntimeHealth | undefined): string {
    if (!health) return 'Checking local CLI…';
    return health.available
      ? `CLI ready${health.version ? ` · ${health.version}` : ''}`
      : 'CLI must be installed first';
  }

  // #endregion
}
