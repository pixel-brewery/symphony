/**
 * Unchanged schema owned by Verification persistence.
 *
 * @public
 */
export const verificationSchema = `      CREATE TABLE IF NOT EXISTS verification_plans (
        id TEXT PRIMARY KEY,
        repository_binding_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_verification_plans_repository
        ON verification_plans(repository_binding_id, created_at);
      CREATE TABLE IF NOT EXISTS verification_runs (
        id TEXT PRIMARY KEY,
        repository_binding_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        started_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_verification_runs_repository
        ON verification_runs(repository_binding_id, started_at);
`;
