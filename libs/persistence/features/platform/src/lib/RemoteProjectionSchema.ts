/**
 * Unchanged fixed-kind remote-projection cache schema.
 *
 * @public
 */
export const remoteProjectionSchema = `
      CREATE TABLE IF NOT EXISTS remote_projections (
        kind TEXT NOT NULL,
        scope TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(kind, scope)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_remote_projections_updated_at
        ON remote_projections(updated_at);
    `;
