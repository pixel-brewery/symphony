// #region Imports

import { AGENT_SPRITE_ATLAS } from './AgentSpriteAtlas';
import type { IAgentSpriteFrame } from './IAgentSpriteFrame';

// #endregion

/** Reuses FLAMOX's frame registration without scaling individual poses. @public */
export function agentSpriteFramePosition(frame: IAgentSpriteFrame): string {
  return `${(frame.columnIndex / (AGENT_SPRITE_ATLAS.columns - 1)) * 100}% ${(frame.rowIndex / (AGENT_SPRITE_ATLAS.rows - 1)) * 100}%`;
}
