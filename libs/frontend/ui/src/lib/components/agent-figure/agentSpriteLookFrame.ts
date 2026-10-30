// #region Imports

import type { IAgentSpriteFrame } from './IAgentSpriteFrame';

// #endregion

/** FLAMOX's sixteen viewer-relative look directions; zero points upwards. @public */
export function agentSpriteLookFrame(
  bounds: Readonly<{ left: number; top: number; width: number; height: number }>,
  target: Readonly<{ x: number; y: number }>,
): IAgentSpriteFrame | null {
  const dx = target.x - (bounds.left + bounds.width / 2);
  const dy = target.y - (bounds.top + bounds.height / 2);
  if (Math.hypot(dx, dy) <= 1) return null;
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const index = Math.round(angle / 22.5) % 16;
  return { columnIndex: index % 8, rowIndex: 9 + Math.floor(index / 8), frameDurationMs: 0 };
}
