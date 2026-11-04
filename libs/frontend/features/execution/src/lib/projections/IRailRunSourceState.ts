export interface IRailRunSourceState {
  readonly kind: 'github' | 'local-runner';
  readonly label: string;
  readonly state: string;
}
