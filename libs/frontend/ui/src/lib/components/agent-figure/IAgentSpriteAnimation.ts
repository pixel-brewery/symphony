// #region Imports

import type { IAgentSpriteFrame } from './IAgentSpriteFrame';

// #endregion

/** A finite gesture or repeating work animation. @public */
export interface IAgentSpriteAnimation {
  readonly frames: readonly IAgentSpriteFrame[];
  readonly loopStartIndex: number | null;
}
