/**
 * Unchanged schema owned by LocalCiExecution persistence.
 *
 * @public
 */
export const localCiExecutionSchema = `      CREATE TABLE IF NOT EXISTS local_ci_executions (
        id TEXT PRIMARY KEY,
        repository_binding_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        started_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_local_ci_executions_repository
        ON local_ci_executions(repository_binding_id, started_at);
    `;
