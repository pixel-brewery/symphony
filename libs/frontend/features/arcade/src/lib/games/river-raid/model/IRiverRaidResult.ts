/** A single finalized player's attempt, retained until the next reset. @public */
export interface IRiverRaidResult {
  readonly player: 1 | 2;
  readonly score: number;
  readonly level: number;
  readonly elapsedSeconds: number;
  readonly outcome: 'lost' | 'completed';
}
