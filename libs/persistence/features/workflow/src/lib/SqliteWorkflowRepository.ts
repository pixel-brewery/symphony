// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type {
  IWorkflowRecordRepository,
  IWorkflowStageChangeQuery,
  IWorkflowStageHistoryRepository,
} from '@symphony/application-workflow';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type {
  IWorkflowAuditEntry,
  IWorkflowRecord,
  IWorkflowStageChange,
  IWorkflowStageChangeHistory,
} from '@symphony/domain-workflow';
import { workflowSchema } from './WorkflowSchema';

// #endregion

interface IPayloadRow {
  payload: string;
}

interface IStageChangeRow {
  readonly payload: string;
  readonly occurred_at: string;
}

/**
 * Persists only workflow-owned state through the shared SQLite connection.
 *
 * @public
 */
export class SqliteWorkflowRepository
  implements IWorkflowRecordRepository, IWorkflowStageHistoryRepository
{
  // #region Fields

  private readonly _database: DatabaseSync;
  private readonly _workspaceId: string | undefined;

  // #endregion

  // #region Ctor

  /**
   * Uses the connection owned by the operational database composition.
   *
   * @param database - Shared connection and transaction lifecycle.
   * @param workspaceId - The workspace that owns this database, when it is a workspace database;
   * without it, an audit entry belongs to the workspace of its work item's workflow record.
   * @public
   */
  public constructor(database: SqliteDatabase, workspaceId?: string) {
    this._database = database.connection;
    this._workspaceId = workspaceId;
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
   * Lists every recorded stage change of each work item of the scope that changed stage at or
   * after `since`, including that item's earlier changes, newest first and at most `limit`.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The changes and the instant from which they are complete.
   * @public
   */
  public listStageChanges(query: IWorkflowStageChangeQuery): IWorkflowStageChangeHistory {
    if (this._workspaceId !== undefined && !query.workspaceIds.includes(this._workspaceId)) {
      return { changes: [], truncated: false };
    }
    const owned = this._workspaceId !== undefined;
    const scope = owned
      ? ''
      : `AND work_item_id IN (
           SELECT work_item_id FROM work_item_workflow
           WHERE workspace_id IN (SELECT value FROM json_each(?))
         )`;
    const scopeParameters = owned ? [] : [JSON.stringify(query.workspaceIds)];
    const changes = `SELECT work_item_id, sequence, payload, occurred_at FROM workflow_audit
         WHERE json_extract(payload, '$.kind') = 'stage-changed' ${scope}`;
    const rows = this._database
      .prepare(
        `WITH changes AS (${changes})
         SELECT payload, occurred_at FROM changes
         WHERE work_item_id IN (SELECT work_item_id FROM changes WHERE occurred_at >= ?)
         ORDER BY occurred_at DESC, sequence DESC
         LIMIT ?`,
      )
      .all(...scopeParameters, query.since, query.limit + 1) as unknown as IStageChangeRow[];
    const truncated = rows.length > query.limit;
    const kept = rows.slice(0, query.limit);
    const earliest = this._database
      .prepare(`WITH changes AS (${changes}) SELECT MIN(occurred_at) AS value FROM changes`)
      .get(...scopeParameters) as { value: string | null } | undefined;
    const recordedSince = truncated ? kept.at(-1)?.occurred_at : (earliest?.value ?? undefined);
    return {
      changes: kept.flatMap((row) => stageChange(JSON.parse(row.payload) as IWorkflowAuditEntry)),
      ...(recordedSince ? { recordedSince } : {}),
      truncated,
    };
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

function stageChange(entry: IWorkflowAuditEntry): readonly IWorkflowStageChange[] {
  if (!entry.toStageId) return [];
  return [
    {
      workItemId: entry.workItemId,
      ...(entry.fromStageId ? { fromStageId: entry.fromStageId } : {}),
      toStageId: entry.toStageId,
      changedAt: entry.occurredAt,
    },
  ];
}
