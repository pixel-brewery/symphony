/**
 * Durable workflow-run history owned by CI persistence: one row per finished run and attempt.
 *
 * @public
 */
export const ciRunHistorySchema = `      CREATE TABLE IF NOT EXISTS ci_run_history (
        run_id TEXT NOT NULL,
        run_attempt INTEGER NOT NULL,
        workspace_id TEXT NOT NULL,
        repository_binding_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (run_id, run_attempt)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_ci_run_history_workspace_started
        ON ci_run_history(workspace_id, started_at);
    `;
