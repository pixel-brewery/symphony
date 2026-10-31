/**
 * What a key pressed in the command palette asks for: move the selection to the `next` or
 * `previous` row, `open` the selected row, `close` the palette, or `stay` (keep focus in the
 * palette instead of tabbing into the dimmed window).
 *
 * @public
 */
export type PaletteKeyCommand = 'next' | 'previous' | 'open' | 'close' | 'stay';
