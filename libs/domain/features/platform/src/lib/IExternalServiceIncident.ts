/**
 * Describes a confirmed external-service disruption that can affect Symphony operations.
 *
 * @public
 */
export interface IExternalServiceIncident {
  readonly id: string;
  readonly providerName: string;
  readonly severity: 'degraded' | 'outage';
  readonly affectedComponents: readonly string[];
  readonly affectedCapabilities: readonly (
    'repository-sync' | 'work-items' | 'pull-requests' | 'automation'
  )[];
  readonly updatedAt: string;
}
