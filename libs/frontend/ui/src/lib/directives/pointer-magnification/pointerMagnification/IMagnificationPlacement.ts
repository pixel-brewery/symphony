/**
 * Where one cell has to be drawn for the current pointer position. Both values are consumed as a
 * single `translate3d(offset) scale(scale)` - in that written order, so the translation is applied
 * in the untransformed parent space the maths is derived in.
 */
export interface IMagnificationPlacement {
  /** Main-axis translation from the cell's resting position, in pixels. */
  readonly offset: number;
  /** Uniform scale about the cell's centre on the main axis. */
  readonly scale: number;
}
