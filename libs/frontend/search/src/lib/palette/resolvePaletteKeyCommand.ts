// #region Imports

import type { PaletteKeyCommand } from './PaletteKeyCommand';

// #endregion

/**
 * Maps a key pressed in the command palette to its palette command: `↓` and `↑` move, `↵` opens
 * (also with ⌘ or Ctrl, which opens normally because Symphony has a single main window), `esc`
 * closes and `Tab` keeps focus in the modal palette. Keys typed while an input method composes,
 * and every other key, belong to the search field.
 *
 * @param event - The key and modifier state of the keyboard event.
 * @returns The palette command, or `undefined` when the search field should handle the key.
 * @public
 */
export function resolvePaletteKeyCommand(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'shiftKey' | 'isComposing'>,
): PaletteKeyCommand | undefined {
  if (event.isComposing) return undefined;
  switch (event.key) {
    case 'ArrowDown':
      return event.altKey || event.shiftKey ? undefined : 'next';
    case 'ArrowUp':
      return event.altKey || event.shiftKey ? undefined : 'previous';
    case 'Enter':
      return event.altKey || event.shiftKey ? undefined : 'open';
    case 'Escape':
      return 'close';
    case 'Tab':
      return 'stay';
    default:
      return undefined;
  }
}
