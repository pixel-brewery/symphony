export interface IWorktreeSnapshot {
  /** Host path of the gzipped archive that is copied into the VM. */
  readonly archivePath: string;
  /** Stable content hash covering every transferred path, mode, and content. */
  readonly hash: string;
  /** Commit the snapshot was taken from, or `unborn` for a repository without commits. */
  readonly headCommit: string;
  readonly branch: string;
  readonly fileCount: number;
  readonly byteCount: number;
  /** Repository-relative paths that were deliberately withheld from the VM. */
  readonly excludedPaths: readonly string[];
  /** Tracked paths deleted in the worktree and therefore absent from the snapshot. */
  readonly deletedPaths: readonly string[];
}
