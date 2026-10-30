/**
 * Execution-owned schema contributions, kept in their original operational database order.
 *
 * @public
 */
export const executionSchema = {
  records: `
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
`,
  events: `      CREATE TABLE IF NOT EXISTS execution_events (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        payload TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_execution_events_sequence
        ON execution_events(sequence);
`,
  deliveryState: `      CREATE TABLE IF NOT EXISTS delivery_groups (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        state TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_delivery_groups_workspace_updated_at
        ON delivery_groups(workspace_id, updated_at);
      CREATE TABLE IF NOT EXISTS delivery_group_members (
        group_id TEXT NOT NULL,
        work_item_id TEXT NOT NULL,
        active INTEGER NOT NULL CHECK(active IN (0, 1)),
        PRIMARY KEY(group_id, work_item_id)
      ) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_group_members_one_active_group
        ON delivery_group_members(work_item_id) WHERE active = 1;
      CREATE TABLE IF NOT EXISTS delivery_group_proposals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        state TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_delivery_group_proposals_workspace_updated_at
        ON delivery_group_proposals(workspace_id, updated_at);
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL UNIQUE,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_goals_updated_at ON goals(updated_at);
      CREATE TABLE IF NOT EXISTS execution_queue (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        queued_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_execution_queue_queued_at ON execution_queue(queued_at);
    `,
} as const;
