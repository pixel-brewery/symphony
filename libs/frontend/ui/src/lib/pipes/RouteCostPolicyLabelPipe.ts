// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const labels: Readonly<Record<string, string>> = {
  any: 'Any cost class',
  'free-only': 'Free or local only',
  'local-only': 'Local only',
};

@Pipe({ name: 'routeCostPolicyLabel', standalone: true, pure: true })
export class RouteCostPolicyLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param policy - Policy.
   * @public
   */
  public transform(policy: string): string {
    return labels[policy] ?? policy;
  }

  // #endregion
}
