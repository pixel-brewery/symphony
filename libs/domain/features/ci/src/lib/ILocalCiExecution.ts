/** Audit evidence for one GitHub workflow run executed on a managed local runner. */
export interface ILocalCiExecution {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  ciRunId: string;
  /** GitHub run attempt this local execution handled. */
  runAttempt?: number;
  revision?: string;
  state: 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt: string;
  /** Bounded, redacted output explaining this exact local execution failure. */
  failureLog?: string;
  /** Bounded diagnostics captured from setup or this execution's managed VM. */
  localDiagnostics?: string;
  runner?: {
    kind: 'managed-linux-vm';
    os: 'linux';
    architecture: 'arm64' | 'x64';
    label: string;
    imageVersion: string;
  };
}
