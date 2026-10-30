export interface ISavedWorkspaceView {
  id: string;
  displayName: string;
  workspaceIds: readonly string[];
  boardLayout: 'mixed' | 'grouped';
}
