/**
 * One measured share of a usage group. Segments carve the same physical walk into the
 * categories a reader can act on, so a bar never shows a single opaque block: every part of
 * the occupied space names what put it there. The share that no declared category claims is
 * attributed to the group's residual segment rather than silently disappearing.
 */
export interface IStorageSegment {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly allocatedBytes: number;
}
