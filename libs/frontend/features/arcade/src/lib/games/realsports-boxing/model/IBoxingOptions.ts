// #region Imports

import type { BoxingContenderId } from './BoxingContenderId';

// #endregion

/** Original one/two-player selection and console difficulty. @public */
export interface IBoxingOptions {
  readonly players: 1 | 2;
  readonly difficulty: 'A' | 'B';
  readonly contenders: readonly [BoxingContenderId, BoxingContenderId];
}
