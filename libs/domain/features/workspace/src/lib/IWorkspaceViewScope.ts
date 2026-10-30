export interface IWorkspaceViewScope {
  workspaceIds: readonly string[];
  savedViewId?: string;
  boardLayout: 'mixed' | 'grouped';
  /** Board (work-item source) shown on the board view; missing shows every board in scope. */
  workItemSourceId?: string;
}
