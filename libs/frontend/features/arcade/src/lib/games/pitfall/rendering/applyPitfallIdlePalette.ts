// #region Imports

import type { IArcadePalette } from '../../shared/rendering/IArcadePalette';

// #endregion

/**
 * Adapts the original delayed hue cycle to the four existing Mosaik material tones.
 * Background and text retain their application contrast; no extra colors are generated.
 *
 * @param palette - The currently active public scheme values.
 * @param idleFrames - Original display frames since the last input.
 * @returns The normal palette or its current monochrome screensaver permutation.
 * @public
 */
export function applyPitfallIdlePalette(
  palette: IArcadePalette,
  idleFrames: number,
): IArcadePalette {
  if (idleFrames < 32768) return palette;
  const shift = (Math.floor((idleFrames - 32768) / 256) + 1) % 4;
  const tones = [palette.surface, palette.highlight, palette.middlelight, palette.lowlight];
  return {
    ...palette,
    surface: tones[shift] ?? palette.surface,
    highlight: tones[(shift + 1) % 4] ?? palette.highlight,
    middlelight: tones[(shift + 2) % 4] ?? palette.middlelight,
    lowlight: tones[(shift + 3) % 4] ?? palette.lowlight,
  };
}
