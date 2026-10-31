export interface IWorktreeSnapshotOptions {
  readonly worktreePath: string;
  /** Directory that receives the archive. */
  readonly outputDirectory: string;
  readonly signal: AbortSignal;
  readonly execute?: (
    executable: string,
    arguments_: readonly string[],
    cwd: string,
    signal: AbortSignal,
  ) => Promise<string>;
}
