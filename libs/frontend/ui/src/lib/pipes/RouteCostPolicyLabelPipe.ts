// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const labels: Readonly<Record<string, Parameters<typeof translateLabel>[0]>> = {
  any: 'loc.symphony.labels.routingCostPolicy.anyCostClass',
  'free-only': 'loc.symphony.labels.routingCostPolicy.freeOrLocalOnly',
  'local-only': 'loc.symphony.labels.routingCostPolicy.localOnly',
};

@Pipe({ name: 'routeCostPolicyLabel', standalone: true, pure: false })
export class RouteCostPolicyLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param policy - Policy.
   * @public
   */
  public transform(policy: string): string {
    const key = labels[policy];
    return key ? translateLabel(key) : policy;
  }

  // #endregion
}
