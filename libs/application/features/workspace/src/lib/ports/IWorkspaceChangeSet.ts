export interface IWorkspaceChangeSet {
  readonly changedFiles: readonly string[];
  readonly diffLines: number;
}
