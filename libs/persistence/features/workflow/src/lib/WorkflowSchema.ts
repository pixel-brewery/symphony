/**
 * Workflow-owned schema contribution for the existing operational database.
 *
 * @public
 */
export const workflowSchema = `      CREATE TABLE IF NOT EXISTS work_item_workflow (
        work_item_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        runtime_state TEXT NOT NULL,
        claim_version INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_work_item_workflow_workspace
        ON work_item_workflow(workspace_id);
      CREATE TABLE IF NOT EXISTS workflow_audit (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        payload TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS idx_workflow_audit_work_item
        ON workflow_audit(work_item_id, sequence);
`;
