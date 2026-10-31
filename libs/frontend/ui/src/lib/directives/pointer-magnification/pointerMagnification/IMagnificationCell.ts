/**
 * One participant of a magnified track, measured at rest on the track's main axis. Cells that
 * only ride along - separators, spacers - declare `maxScale: 1`: they take a displacement but
 * never grow, so they contribute nothing to the growth their neighbours have to make room for.
 */
export interface IMagnificationCell {
  /** Resting centre on the main axis, in the same coordinate space as the pointer. */
  readonly centre: number;
  /** Resting margin-box extent on the main axis. */
  readonly extent: number;
  /** Scale reached when the pointer sits exactly on `centre`. `1` never magnifies. */
  readonly maxScale: number;
}
