/**
 * Moves the palette's selected row one step, wrapping from the last row to the first and back.
 *
 * @param index - Currently selected row in the flat keyboard order.
 * @param count - Number of rows the palette lists.
 * @param direction - `next` moves down, `previous` moves up.
 * @returns The newly selected row, or `0` when the palette lists nothing.
 * @public
 */
export function movePaletteSelection(
  index: number,
  count: number,
  direction: 'next' | 'previous',
): number {
  if (count <= 0) return 0;
  const current = Math.min(Math.max(index, 0), count - 1);
  return direction === 'next' ? (current + 1) % count : (current - 1 + count) % count;
}
