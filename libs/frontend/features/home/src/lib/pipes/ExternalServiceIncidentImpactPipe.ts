// #region Imports

import { Pipe, PipeTransform } from '@angular/core';
import type { IExternalServiceIncident } from '@symphony/domain-platform';

// #endregion

function componentLabel(components: readonly string[]): string {
  if (components.length < 2) return components[0] ?? 'A service';
  if (components.length === 2) return `${components[0]} and ${components[1]}`;
  return `${components.slice(0, -1).join(', ')}, and ${components.at(-1)}`;
}

/**
 * Formats a confirmed provider incident as operator-relevant impact.
 *
 * @public
 */
@Pipe({ name: 'externalServiceIncidentImpact', standalone: true, pure: true })
export class ExternalServiceIncidentImpactPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the affected provider components and the operations that may be delayed.
   *
   * @param incident - Confirmed external-service incident.
   * @public
   */
  public transform(incident: IExternalServiceIncident): string {
    const components = componentLabel(incident.affectedComponents);
    const verb = incident.affectedComponents.length === 1 ? 'is' : 'are';
    const effects: string[] = [];
    if (incident.affectedCapabilities.includes('automation')) {
      effects.push(
        'Local workflow runs may be delayed because GitHub still coordinates self-hosted jobs.',
      );
    }
    if (incident.affectedCapabilities.some((capability) => capability !== 'automation')) {
      effects.push('GitHub-backed workspace data and repository synchronization may be delayed.');
    }
    return `${components} ${verb} affected. ${effects.join(' ')}`;
  }

  // #endregion
}
