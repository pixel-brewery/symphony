// #region Imports

import type { IPitfallIISnapshot } from './IPitfallIISnapshot';
import { PitfallIISpritePatterns } from './PitfallIISpritePatterns';

// #endregion

/** Selects the same original bitmap for both TIA-style collision and canvas rendering. @public */
export function getPitfallIIPlayerSprite(player: IPitfallIISnapshot['player']): readonly number[] {
  if (player.pose === 'swim')
    return PitfallIISpritePatterns.swimmer[player.animationFrame % 4] ?? [];
  if (player.pose === 'balloon') return PitfallIISpritePatterns.hanging;
  const frame =
    player.pose === 'idle' || player.pose === 'hurt'
      ? 5
      : player.pose === 'climb'
        ? 7 + (player.animationFrame % 2)
        : player.pose === 'jump' || player.pose === 'celebrate'
          ? 0
          : player.animationFrame % 5;
  return PitfallIISpritePatterns.harry[frame] ?? [];
}
