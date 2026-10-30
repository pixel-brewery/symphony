// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IAutonomyStatus {
  readonly enabled: boolean;
  readonly nextCycleAt?: string;
}

@Pipe({ name: 'autonomyNextCycleLabel', standalone: true, pure: true })
export class AutonomyNextCycleLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @param now - Now.
   * @public
   */
  public transform(status: IAutonomyStatus | undefined, now: number): string {
    if (!status?.enabled) return 'No new autonomous tasks will start.';
    if (!status.nextCycleAt) return 'The next autonomous cycle is being scheduled.';
    const remainingSeconds = Math.max(
      0,
      Math.ceil((new Date(status.nextCycleAt).getTime() - now) / 1_000),
    );
    if (remainingSeconds < 60) return `Next cycle in ${remainingSeconds}s`;
    return `Next cycle in ${Math.ceil(remainingSeconds / 60)}m`;
  }

  // #endregion
}
