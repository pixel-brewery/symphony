// #region Imports

import type { IArcadePalette } from './IArcadePalette';

// #endregion

/** Reads live public Mosaik tones so a running game follows the application theme. @public */
export function readArcadePalette(canvas: HTMLCanvasElement): IArcadePalette {
  const style = canvas.ownerDocument.defaultView?.getComputedStyle(canvas);
  const foreground = style?.getPropertyValue('--mosaik-scheme-foreground').trim() || 'currentColor';
  const read = (role: string): string =>
    style?.getPropertyValue(`--mosaik-scheme-${role}`).trim() || foreground;
  return {
    background: read('background'),
    surface: read('surface'),
    highlight: read('highlight'),
    middlelight: read('middlelight'),
    lowlight: read('lowlight'),
    foreground,
  };
}
