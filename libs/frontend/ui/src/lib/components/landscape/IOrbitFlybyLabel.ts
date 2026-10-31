// #region Imports

import type { IOrbitCrewMember } from './IOrbitCrewMember';

// #endregion

/** Passive pilot identification anchored to a visible spacecraft in CSS pixels. @public */
export interface IOrbitFlybyLabel {
  readonly id: string;
  readonly pilot: IOrbitCrewMember;
  readonly source: string;
  readonly x: number;
  readonly y: number;
  /** Projected model extent; changes with camera distance and viewport size. @public */
  readonly size: number;
}
