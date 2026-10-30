/**
 * Unchanged schema owned by RepositoryTrust persistence.
 *
 * @public
 */
export const repositoryTrustSchema = `
      CREATE TABLE IF NOT EXISTS repository_trust_grants (
        repository_binding_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_repository_trust_workspace
        ON repository_trust_grants(workspace_id);
`;
