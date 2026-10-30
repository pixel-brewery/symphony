// #region Imports

import type { IOrbitNode } from './IOrbitNode';
import type { IOrbitRing } from './IOrbitRing';
import type { ISceneEdge } from './ISceneEdge';

// #endregion

/** Complete filtered world geometry; only labels may be reduced by semantic zoom. @public */
export interface IOrbitScene {
  readonly nodes: readonly IOrbitNode[];
  readonly rings: readonly IOrbitRing[];
  readonly edges: readonly ISceneEdge[];
  readonly ticketCount: number;
}
