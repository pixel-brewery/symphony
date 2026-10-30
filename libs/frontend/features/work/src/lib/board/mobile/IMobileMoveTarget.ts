/** A board column this ticket may be moved to, with the one it currently rests in marked. */
export interface IMobileMoveTarget {
  readonly id: string;
  readonly label: string;
  readonly current: boolean;
}
