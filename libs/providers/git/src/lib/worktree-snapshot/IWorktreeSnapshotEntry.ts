export interface IWorktreeSnapshotEntry {
  readonly path: string;
  readonly mode: 'file' | 'executable' | 'symlink';
  readonly contentHash: string;
  readonly byteCount: number;
}
