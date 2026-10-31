// #region Imports

import type { IRiverRaidBlock } from './IRiverRaidBlock';

// #endregion

/** A river object with its current patrol position and destruction animation. @public */
export interface IRiverRaidActor {
  readonly id: number;
  readonly kind: IRiverRaidBlock['object']['kind'];
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly direction: -1 | 1;
  readonly destroyed: boolean;
  readonly explosion: number;
}
