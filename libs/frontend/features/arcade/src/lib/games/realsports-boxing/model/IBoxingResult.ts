/** Final match result retained while the attract fight resumes behind the result menu. @public */
export interface IBoxingResult {
  readonly winner: 0 | 1 | null;
  readonly reason: 'knockout' | 'technical-knockout' | 'decision' | 'draw';
  readonly scores: readonly [number, number];
  readonly round: number;
}
