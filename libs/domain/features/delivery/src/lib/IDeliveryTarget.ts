// #region Imports

import type { OrbitCelestialBody } from './OrbitCelestialBody';

// #endregion

/**
 * Repository-owned destination. Publication and installation are distinct from deployment.
 *
 * @public
 */
export interface IDeliveryTarget {
  readonly id: string;
  readonly workspaceId: string;
  readonly repositoryBindingId: string;
  readonly displayName: string;
  readonly kind: 'environment' | 'release-channel' | 'installation';
  readonly environment: string;
  readonly production: boolean;
  /** Missing values retain the original Sun at the centre of the orbit. */
  readonly celestialBody?: OrbitCelestialBody;
  /** Optional workflow and input that accepts the exact immutable version to deliver. */
  readonly workflowId?: string;
  readonly versionInput?: string;
  readonly environmentInput?: string;
  readonly operationInput?: string;
}
