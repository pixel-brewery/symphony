// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const labels: Readonly<Record<string, Parameters<typeof translateLabel>[0]>> = {
  paid: 'loc.symphony.labels.routingCostClass.paid',
  'subscription-included': 'loc.symphony.labels.routingCostClass.subscriptionIncluded',
  'free-tier': 'loc.symphony.labels.routingCostClass.freeTier',
  local: 'loc.symphony.labels.routingCostClass.local',
  unknown: 'loc.symphony.labels.routingCostClass.unknownCost',
};

@Pipe({ name: 'routeCostClassLabel', standalone: true, pure: false })
export class RouteCostClassLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param costClass - Cost class.
   * @public
   */
  public transform(costClass: string): string {
    const key = labels[costClass];
    return key ? translateLabel(key) : costClass;
  }

  // #endregion
}
