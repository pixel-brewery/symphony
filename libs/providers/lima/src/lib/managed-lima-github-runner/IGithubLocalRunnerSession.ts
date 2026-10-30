export interface IGithubLocalRunnerSession {
  readonly runnerName: string;
  readonly os: 'linux';
  readonly architecture: 'arm64' | 'x64';
  readonly imageVersion: string;
  readonly completion: Promise<void>;
  diagnostics(): Promise<string>;
  stop(): Promise<void>;
}
