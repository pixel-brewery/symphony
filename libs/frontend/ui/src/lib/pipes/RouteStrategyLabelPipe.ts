// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const labels: Readonly<Record<string, Parameters<typeof translateLabel>[0]>> = {
  priority: 'loc.symphony.labels.routingStrategy.priorityOrder',
  'quality-first': 'loc.symphony.labels.routingStrategy.qualityFirst',
  'last-known-good': 'loc.symphony.labels.routingStrategy.lastKnownGood',
  'lowest-cost': 'loc.symphony.labels.routingStrategy.lowestCost',
  'lowest-latency': 'loc.symphony.labels.routingStrategy.lowestLatency',
  'most-reliable': 'loc.symphony.labels.routingStrategy.mostReliable',
  'least-used': 'loc.symphony.labels.routingStrategy.leastUsed',
  'reset-aware': 'loc.symphony.labels.routingStrategy.resetAware',
  balanced: 'loc.symphony.labels.routingStrategy.balancedRouting',
};

@Pipe({ name: 'routeStrategyLabel', standalone: true, pure: false })
export class RouteStrategyLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param strategy - Strategy.
   * @public
   */
  public transform(strategy: string): string {
    const key = labels[strategy];
    return key ? translateLabel(key) : strategy;
  }

  // #endregion
}
