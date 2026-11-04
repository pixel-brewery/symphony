/** The existing source facts rendered by the CI Action drawer. @public */
export interface IActionDrawerSourceState {
  readonly kind: 'github' | 'local-runner';
  readonly label: string;
  readonly state: string;
}
