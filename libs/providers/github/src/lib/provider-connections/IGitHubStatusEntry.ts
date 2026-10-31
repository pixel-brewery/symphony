export interface IGitHubStatusEntry {
  readonly active?: boolean;
  readonly gitProtocol?: 'https' | 'ssh';
  readonly host?: string;
  readonly login?: string;
  readonly scopes?: string;
  readonly state?: string;
}
