/** A world-space orbit; angles are radians, distances are scene units. @public */
export interface IOrbitRing {
  readonly id: string;
  readonly label: string;
  readonly radius: number;
  readonly tilt: number;
  readonly rotation: number;
  readonly targetId?: string;
  /** Destination orbits are dashed; the work-item belt is a solid guide. Defaults to solid. */
  readonly style?: 'solid' | 'dashed';
}
