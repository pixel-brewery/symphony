/** Original Game Select and independent console difficulty switches. @public */
export interface ISeaquestOptions {
  readonly players: 1 | 2;
  readonly difficultyA: 'A' | 'B';
  readonly difficultyB: 'A' | 'B';
}
