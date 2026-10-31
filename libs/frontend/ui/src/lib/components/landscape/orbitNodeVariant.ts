// #region Imports

import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';
import type { IOrbitNode } from './IOrbitNode';

// #endregion

/** Shared semantic colour meaning for world bodies and public Mosaik labels. @public */
export function orbitNodeVariant(node: IOrbitNode): Variant {
  if (node.deliveryState === 'failed') return 'danger';
  if (node.deliveryState === 'pending' || node.deliveryState === 'stale') return 'warning';
  if (node.kind === 'production') return 'warning';
  if (node.kind === 'target') return node.deliveryState === 'confirmed' ? 'success' : 'secondary';
  switch (node.stageKind) {
    case 'done':
    case 'completed':
    case 'terminal':
      return 'success';
    case 'blocked':
    case 'failed':
      return 'danger';
    case 'active':
    case 'in-progress':
    case 'working':
    case 'automated':
      return 'warning';
    case 'review':
    case 'human-gate':
      return 'highlight';
    default:
      return 'info';
  }
}
