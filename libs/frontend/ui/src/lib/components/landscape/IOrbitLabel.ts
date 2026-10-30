// #region Imports

import type { IOrbitNode } from './IOrbitNode';

// #endregion

/** Collision-free, ID-stable DOM label position in the scene viewport. @public */
export interface IOrbitLabel {
  readonly node: IOrbitNode;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
}
