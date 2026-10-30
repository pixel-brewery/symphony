/** A completed expedition in the player's personal score table. @public */
export interface IPitfallRecord {
  readonly id: string;
  readonly score: number;
  readonly treasures: number;
  readonly elapsedSeconds: number;
  readonly completedAt: string;
  readonly outcome: 'completed' | 'lost';
}
