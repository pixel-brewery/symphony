// #region Imports

import type { OrbitCelestialBody } from '@symphony/domain-delivery';

// #endregion

/** A stable, provider-neutral world object projected from existing work and delivery data. @public */
export interface IOrbitNode {
  readonly id: string;
  readonly kind: 'production' | 'target' | 'ticket' | 'group';
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly label: string;
  readonly title?: string;
  readonly workItemId?: string;
  readonly targetId?: string;
  readonly targetKind?: 'environment' | 'release-channel' | 'installation';
  readonly celestialBody?: OrbitCelestialBody;
  readonly stageId?: string;
  readonly stageLabel?: string;
  readonly stageKind?: string;
  readonly count?: number;
  readonly memberIds?: readonly string[];
  readonly relatedIds?: readonly string[];
  readonly version?: string;
  readonly revision?: string;
  readonly observedAt?: string;
  readonly deliveryState?:
    'unassigned' | 'unconfirmed' | 'confirmed' | 'pending' | 'failed' | 'stale';
  /** Cluster meaning that colours a ticket or a cluster label instead of its work stage. */
  readonly tone?: 'neutral' | 'success' | 'danger';
}
