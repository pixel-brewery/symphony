// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { IWorkflowRecordRepository } from '@symphony/application-workflow';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';
import { workflowSchema } from './WorkflowSchema';

// #endregion

interface IPayloadRow {
  payload: string;
}

/**
 * Persists only workflow-owned state through the shared SQLite connection.
 *
 * @public
 */
export class SqliteWorkflowRepository implements IWorkflowRecordRepository {
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Uses the connection owned by the operational database composition.
   *
   * @param database - Shared connection and transaction lifecycle.
   * @public
   */
  public constructor(database: SqliteDatabase) {
    this._database = database.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies only this feature's idempotent schema when used independently.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(workflowSchema);
  }

  /**
   * Returns the workflow record.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public workflowRecord(workItemId: string): IWorkflowRecord | undefined {
    const row = this._database
      .prepare('SELECT payload FROM work_item_workflow WHERE work_item_id = ?')
      .get(workItemId) as IPayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as IWorkflowRecord) : undefined;
  }

  /**
   * Lists the workflow records.
   *
   * @public
   */
  public listWorkflowRecords(): readonly IWorkflowRecord[] {
    return (
      this._database
        .prepare('SELECT payload FROM work_item_workflow')
        .all() as unknown as IPayloadRow[]
    ).map((row) => JSON.parse(row.payload) as IWorkflowRecord);
  }

  /**
   * Saves the workflow record.
   *
   * @param record - Record.
   * @public
   */
  public saveWorkflowRecord(record: IWorkflowRecord): void {
    this._database
      .prepare(
        `INSERT INTO work_item_workflow(
           work_item_id, workspace_id, stage_id, runtime_state, claim_version, payload, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(work_item_id) DO UPDATE SET
           workspace_id = excluded.workspace_id,
           stage_id = excluded.stage_id,
           runtime_state = excluded.runtime_state,
           claim_version = excluded.claim_version,
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .run(
        record.workItemId,
        record.workspaceId,
        record.stageId,
        record.runtimeState,
        record.claim?.claimVersion ?? 0,
        JSON.stringify(record),
        record.updatedAt,
      );
  }

  /**
   * Append-only: an audit entry is never updated or deleted.
   *
   * @param entry - Entry.
   * @public
   */
  public saveWorkflowAudit(entry: IWorkflowAuditEntry): void {
    this._database
      .prepare(
        `INSERT INTO workflow_audit(id, work_item_id, sequence, payload, occurred_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(entry.id, entry.workItemId, entry.sequence, JSON.stringify(entry), entry.occurredAt);
  }

  /**
   * Lists the workflow audit.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public listWorkflowAudit(workItemId: string): readonly IWorkflowAuditEntry[] {
    return (
      this._database
        .prepare('SELECT payload FROM workflow_audit WHERE work_item_id = ? ORDER BY sequence ASC')
        .all(workItemId) as unknown as IPayloadRow[]
    ).map((row) => JSON.parse(row.payload) as IWorkflowAuditEntry);
  }

  /**
   * Returns the next workflow audit sequence.
   *
   * @public
   */
  public nextWorkflowAuditSequence(): number {
    const row = this._database
      .prepare('SELECT COALESCE(MAX(sequence), 0) AS value FROM workflow_audit')
      .get() as { value: number } | undefined;
    return (row?.value ?? 0) + 1;
  }

  // #endregion
}
