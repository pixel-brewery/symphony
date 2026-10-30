/** Original cartridge selection and the two team difficulty switches. @public */
export interface IBreakoutOptions {
  readonly variation: number;
  readonly players: 1 | 2 | 3 | 4;
  readonly difficultyA: 'A' | 'B';
  readonly difficultyB: 'A' | 'B';
}
