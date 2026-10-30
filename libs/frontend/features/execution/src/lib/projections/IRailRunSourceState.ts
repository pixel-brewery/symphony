export interface IRailRunSourceState {
  readonly kind: 'github' | 'local-runner';
  readonly label: 'GitHub' | 'Local runner';
  readonly state: string;
}
