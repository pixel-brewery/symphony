// #region Imports

import type { IOrbitNode } from './IOrbitNode';

// #endregion

/** A visible world anchor projected into CSS pixels. @public */
export interface IOrbitProjectedNode {
  readonly node: IOrbitNode;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly radius: number;
}
