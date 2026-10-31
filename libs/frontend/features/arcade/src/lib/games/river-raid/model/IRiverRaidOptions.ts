/** Console game-select and independent player difficulty switches. @public */
export interface IRiverRaidOptions {
  readonly players: 1 | 2;
  readonly difficulty: readonly ['a' | 'b', 'a' | 'b'];
}
