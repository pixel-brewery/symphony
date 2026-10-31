// #region Imports

import { PitfallSpritePatterns } from '../../pitfall/model/PitfallSpritePatterns';

// #endregion

/**
 * Eight-bit Atari 2600 sprite rows, ordered from the top scanline down.
 * Pitfall II retains Harry's original running/climbing poses and scorpion masks.
 * Additional poses are decoded from the original NTSC DPC graphics tables and checked
 * against screenshots; see rendering/README.md for byte offsets and source provenance.
 *
 * @public
 */
export const PitfallIISpritePatterns = {
  harry: [
    ...PitfallSpritePatterns.harry.slice(0, 6),
    [0, 0, 0, 0, 6, 6, 6, 4, 60, 120, 108, 102, 96, 96, 96, 96, 96, 96, 96, 112, 64, 96],
    ...PitfallSpritePatterns.harry.slice(7),
  ],
  scorpion: PitfallSpritePatterns.scorpion.map((rows) => rows.slice(5)),
  gold: PitfallSpritePatterns.bar.map((rows) => rows.slice(1, 15)),
  diamond: [56, 124, 56, 16, 56, 108, 68, 68, 68, 108, 56],
  quickclaw: [
    [0, 16, 28, 28, 18, 26, 90, 154, 158, 156, 152, 88, 56, 28, 20, 20, 20, 20, 20, 20, 20, 54],
    [0, 16, 28, 28, 18, 26, 154, 90, 94, 92, 88, 88, 56, 28, 54, 34, 34, 34, 34, 20, 20, 54],
  ],
  rhonda: [24, 56, 48, 24, 16, 24, 56, 88, 88, 56, 24, 24, 24, 24, 24, 24, 28, 16, 24],
  rat: [
    [96, 144, 128, 132, 254, 127, 124, 36],
    [48, 72, 64, 68, 126, 127, 124, 72],
  ],
  checkpoint: [28, 20, 119, 65, 119, 20, 28],
  bat: [
    [130, 170, 214, 238, 254, 124, 16, 0, 0, 0],
    [0, 40, 16, 0, 56, 124, 214, 198, 130, 68],
  ],
  condor: [
    [208, 104, 112, 48, 106, 247, 225, 16, 0, 0, 0],
    [0, 0, 0, 48, 106, 247, 249, 104, 120, 208, 224],
  ],
  frog: [
    [0, 0, 0, 2, 63, 127, 116, 100, 50],
    [2, 63, 127, 116, 108, 64, 192, 128, 128],
  ],
  eel: [
    [0, 3, 100, 152],
    [0, 0, 155, 100],
  ],
  swimmer: [
    [0, 6, 6, 6, 4, 5, 15, 60, 44, 24, 24, 112, 80, 240, 128, 128, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 3, 34, 30, 15, 29, 24, 24, 56, 240, 160, 128, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 19, 26, 14, 14, 31, 25, 24, 248, 144, 240, 64, 64, 0, 0, 0, 0, 0, 0],
    [0, 6, 6, 6, 5, 5, 14, 12, 30, 26, 24, 48, 240, 160, 128, 0, 0, 0, 0, 0, 0, 0],
  ],
  balloon: [
    56, 124, 254, 254, 254, 254, 124, 56, 16, 16, 24, 32, 32, 32, 16, 16, 16, 8, 8, 8, 16, 16, 16,
    32, 32, 32, 32,
  ],
  hanging: [26, 26, 26, 18, 26, 30, 28, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 28, 16, 24],
  waterfall: [
    [
      192, 192, 224, 224, 224, 112, 112, 112, 48, 56, 56, 56, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 88, 26, 152, 25, 24, 60, 90, 173, 239, 118,
    ],
    [
      192, 192, 224, 224, 224, 112, 112, 112, 48, 56, 56, 56, 24, 24, 24, 24, 24, 24, 24, 24, 24,
      24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 88, 26, 24, 90, 24, 60, 110, 118, 44,
    ],
  ],
} as const;
