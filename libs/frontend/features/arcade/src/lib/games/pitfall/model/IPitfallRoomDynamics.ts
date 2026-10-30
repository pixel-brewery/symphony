/** Mutable scene positions projected into an immutable room snapshot. @public */
export interface IPitfallRoomDynamics {
  readonly objectX: number;
  readonly scorpionX: number;
  readonly scorpionFacing: -1 | 1;
  readonly animationFrame: number;
  readonly pitFrame: number;
}
