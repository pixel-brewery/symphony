// #region Imports

import { type ChildProcess } from 'node:child_process';

// #endregion

export interface IManagedLimaSession {
  readonly instanceName: string;
  readonly architecture: 'arm64' | 'x64';
  readonly imageVersion: string;
  /** True when this session reset a warm instance instead of provisioning a new one. */
  readonly reused: boolean;
  /** Aborts when the caller cancels or the storage safety stop activates. */
  readonly signal: AbortSignal;
  /** Set once the storage safety stop aborted this session. */
  storageFailure(): Error | undefined;
  /** Runs `limactl` with the given arguments and returns its trimmed output. */
  limactl(arguments_: readonly string[], timeoutMilliseconds?: number): Promise<string>;
  /** Runs a bash login-shell script inside the guest. */
  shell(script: string, timeoutMilliseconds?: number): Promise<string>;
  /** Spawns a long-running guest process. */
  spawnGuest(arguments_: readonly string[]): ChildProcess;
  /** Streams a value into a guest file through standard input, never through an argument. */
  writeGuestFile(guestPath: string, value: string): Promise<void>;
  /** Copies a host file into the guest through Lima's own transport. */
  copyToGuest(hostPath: string, guestPath: string, timeoutMilliseconds?: number): Promise<void>;
  /** Copies a guest file or directory back to the host through Lima's own transport. */
  copyFromGuest(guestPath: string, hostPath: string, timeoutMilliseconds?: number): Promise<void>;
  diagnostics(): Promise<string>;
  stop(): Promise<void>;
}
