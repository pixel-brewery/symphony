// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const labels: Readonly<Record<string, string>> = {
  priority: 'Priority order',
  'quality-first': 'Quality first',
  'last-known-good': 'Last known good',
  'lowest-cost': 'Lowest cost',
  'lowest-latency': 'Lowest latency',
  'most-reliable': 'Most reliable',
  'least-used': 'Least used',
  'reset-aware': 'Reset aware',
  balanced: 'Balanced routing',
};

@Pipe({ name: 'routeStrategyLabel', standalone: true, pure: true })
export class RouteStrategyLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param strategy - Strategy.
   * @public
   */
  public transform(strategy: string): string {
    return labels[strategy] ?? strategy;
  }

  // #endregion
}
