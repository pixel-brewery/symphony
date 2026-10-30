export interface IRepositoryBinding {
  id: string;
  workspaceId: string;
  sourceControlConnectionId: string;
  displayName: string;
  provider: 'github' | 'simulated';
  host: string;
  owner: string;
  name: string;
  defaultBranch: string;
  /** Machine-local path. Portable persistence must strip this value. */
  localPath: string;
  enabled: boolean;
  /** Repository-owned provisioning executed in the managed guest before any workflow step. */
  localCiSetupScript?: string;
}
