/**
 * Automation-owned schema contribution for the existing operational database.
 *
 * @public
 */
export const automationSchema = `      CREATE TABLE IF NOT EXISTS automation_receipts (
        signal_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_automation_receipts_updated_at
        ON automation_receipts(updated_at);
      CREATE TABLE IF NOT EXISTS automation_checkpoints (
        source_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        initialized_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS agentic_deliveries (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_agentic_deliveries_updated_at
        ON agentic_deliveries(updated_at);
`;
