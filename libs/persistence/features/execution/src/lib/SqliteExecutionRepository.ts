// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { IExecutionRepository } from '@symphony/application-execution';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';
import { executionSchema } from './ExecutionSchema';

// #endregion

interface IPayloadRow {
  payload: string;
}

/**
 * Persists only execution-owned state through the shared SQLite connection.
 *
 * @public
 */
export class SqliteExecutionRepository implements IExecutionRepository {
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Uses the connection owned by the operational database composition.
   *
   * @param _connection - Shared connection and transaction lifecycle.
   * @public
   */
  public constructor(private readonly _connection: SqliteDatabase) {
    this._database = _connection.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies only this feature's idempotent schema when used independently.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(executionSchema.records);
    this._database.exec(executionSchema.events);
    this._database.exec(executionSchema.deliveryState);
  }

  /**
   * Saves the execution.
   *
   * @param execution - Execution.
   * @public
   */
  public saveExecution(execution: IExecutionRecord): void {
    this._database
      .prepare(
        `INSERT INTO executions(id, payload, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      )
      .run(execution.id, JSON.stringify(execution), execution.finishedAt ?? execution.startedAt);
  }

  /**
   * Saves the event.
   *
   * @param event - Event.
   * @public
   */
  public saveEvent(event: IExecutionEvent): void {
    this._database
      .prepare(
        `INSERT INTO execution_events(id, execution_id, sequence, payload, occurred_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(event.id, event.executionId, event.sequence, JSON.stringify(event), event.occurredAt);
  }

  /**
   * Lists the executions.
   *
   * @public
   */
  public listExecutions(): readonly IExecutionRecord[] {
    const rows = this._database
      .prepare('SELECT payload FROM executions ORDER BY updated_at DESC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IExecutionRecord);
  }

  /**
   * Lists the events.
   *
   * @public
   */
  public listEvents(): readonly IExecutionEvent[] {
    const rows = this._database
      .prepare('SELECT payload FROM execution_events ORDER BY sequence ASC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IExecutionEvent);
  }

  /**
   * Persists a group and its membership atomically.
   *
   * @param group - Delivery group.
   * @public
   */
  public saveDeliveryGroup(group: IDeliveryGroup): void {
    const active = group.state !== 'dissolved' && group.state !== 'completed' ? 1 : 0;
    this._connection.immediateTransaction(() => {
      this._database
        .prepare(
          `INSERT INTO delivery_groups(id, workspace_id, state, payload, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET workspace_id = excluded.workspace_id,
             state = excluded.state, payload = excluded.payload, updated_at = excluded.updated_at`,
        )
        .run(group.id, group.workspaceId, group.state, JSON.stringify(group), group.updatedAt);
      this._database.prepare('DELETE FROM delivery_group_members WHERE group_id = ?').run(group.id);
      const insertMember = this._database.prepare(
        'INSERT INTO delivery_group_members(group_id, work_item_id, active) VALUES (?, ?, ?)',
      );
      for (const workItemId of group.workItemIds) insertMember.run(group.id, workItemId, active);
    });
  }

  /**
   * Lists all current and historical groups.
   *
   * @public
   */
  public listDeliveryGroups(): readonly IDeliveryGroup[] {
    const rows = this._database
      .prepare('SELECT payload FROM delivery_groups ORDER BY updated_at DESC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IDeliveryGroup);
  }

  /**
   * Saves an Analyzer relationship proposal.
   *
   * @param proposal - Relationship proposal.
   * @public
   */
  public saveDeliveryGroupProposal(proposal: IDeliveryGroupProposal): void {
    this._database
      .prepare(
        `INSERT INTO delivery_group_proposals(id, workspace_id, state, payload, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET workspace_id = excluded.workspace_id,
           state = excluded.state, payload = excluded.payload, updated_at = excluded.updated_at`,
      )
      .run(
        proposal.id,
        proposal.workspaceId,
        proposal.state,
        JSON.stringify(proposal),
        proposal.updatedAt,
      );
  }

  /**
   * Lists delivery-group proposals.
   *
   * @public
   */
  public listDeliveryGroupProposals(): readonly IDeliveryGroupProposal[] {
    const rows = this._database
      .prepare('SELECT payload FROM delivery_group_proposals ORDER BY updated_at DESC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IDeliveryGroupProposal);
  }

  /**
   * Saves the goal.
   *
   * @param goal - Goal.
   * @public
   */
  public saveGoal(goal: IGoalRecord): void {
    this._database
      .prepare(
        `INSERT INTO goals(id, work_item_id, payload, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(work_item_id) DO UPDATE SET id = excluded.id,
           payload = excluded.payload, updated_at = excluded.updated_at`,
      )
      .run(goal.id, goal.workItemId, JSON.stringify(goal), goal.updatedAt);
  }

  /**
   * Lists the goals.
   *
   * @public
   */
  public listGoals(): readonly IGoalRecord[] {
    const rows = this._database
      .prepare('SELECT payload FROM goals ORDER BY updated_at DESC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IGoalRecord);
  }

  /**
   * Saves the execution queue entry.
   *
   * @param entry - Entry.
   * @public
   */
  public saveExecutionQueueEntry(entry: IExecutionQueueEntry): void {
    this._database
      .prepare(
        `INSERT INTO execution_queue(id, work_item_id, payload, queued_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, queued_at = excluded.queued_at`,
      )
      .run(entry.id, entry.workItemId, JSON.stringify(entry), entry.queuedAt);
  }

  /**
   * Removes the execution queue entry.
   *
   * @param entryId - Entry id.
   * @public
   */
  public removeExecutionQueueEntry(entryId: string): void {
    this._database.prepare('DELETE FROM execution_queue WHERE id = ?').run(entryId);
  }

  /**
   * Lists the execution queue.
   *
   * @public
   */
  public listExecutionQueue(): readonly IExecutionQueueEntry[] {
    const rows = this._database
      .prepare('SELECT payload FROM execution_queue ORDER BY queued_at ASC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IExecutionQueueEntry);
  }

  // #endregion
}
