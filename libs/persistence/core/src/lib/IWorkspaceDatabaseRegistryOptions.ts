/**
 * Supplies the configured workspace identifiers and their existing database paths.
 *
 * @public
 */
export interface IWorkspaceDatabaseRegistryOptions {
  readonly workspaceIds: () => readonly string[];
  readonly databasePath: (workspaceId: string) => string;
}
