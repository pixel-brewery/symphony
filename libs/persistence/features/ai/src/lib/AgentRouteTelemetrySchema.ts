/**
 * Unchanged workspace route-memory and account-cooldown schema.
 *
 * @public
 */
export const agentRouteTelemetrySchema = `
      CREATE TABLE IF NOT EXISTS agent_route_telemetry (
        workspace_id TEXT NOT NULL,
        route_candidate_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, route_candidate_id)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_agent_route_telemetry_updated_at
        ON agent_route_telemetry(updated_at);
      CREATE TABLE IF NOT EXISTS agent_account_cooldowns (
        workspace_id TEXT NOT NULL,
        ai_connection_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_at TEXT NOT NULL,
        PRIMARY KEY (workspace_id, ai_connection_id)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_agent_account_cooldowns_retry_at
        ON agent_account_cooldowns(retry_at);
    `;
