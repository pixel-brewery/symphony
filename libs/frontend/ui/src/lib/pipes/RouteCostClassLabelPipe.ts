// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const labels: Readonly<Record<string, string>> = {
  paid: 'Paid',
  'subscription-included': 'Subscription included',
  'free-tier': 'Free tier',
  local: 'Local',
  unknown: 'Unknown cost',
};

@Pipe({ name: 'routeCostClassLabel', standalone: true, pure: true })
export class RouteCostClassLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param costClass - Cost class.
   * @public
   */
  public transform(costClass: string): string {
    return labels[costClass] ?? costClass;
  }

  // #endregion
}
