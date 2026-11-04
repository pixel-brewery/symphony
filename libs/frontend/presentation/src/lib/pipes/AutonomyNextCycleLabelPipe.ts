// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IAutonomyStatus {
  readonly enabled: boolean;
  readonly nextCycleAt?: string;
}

@Pipe({ name: 'autonomyNextCycleLabel', standalone: true, pure: false })
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
    if (!status?.enabled)
      return translateLabel('loc.symphony.labels.no.new.autonomous.tasks.will.start.56624ee');
    if (!status.nextCycleAt)
      return translateLabel(
        'loc.symphony.labels.the.next.autonomous.cycle.is.being.scheduled.8e593a2',
      );
    const remainingSeconds = Math.max(
      0,
      Math.ceil((new Date(status.nextCycleAt).getTime() - now) / 1_000),
    );
    if (remainingSeconds < 60)
      return translateLabel('loc.symphony.labels.next.cycle.in.s.93176f3', remainingSeconds);
    return translateLabel(
      'loc.symphony.labels.next.cycle.in.m.b214ac2',
      Math.ceil(remainingSeconds / 60),
    );
  }

  // #endregion
}
