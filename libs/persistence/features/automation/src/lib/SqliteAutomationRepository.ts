// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type { IAutomationRepository } from '@symphony/application-automation';
import type { SqliteDatabase } from '@symphony/persistence-core';
import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import { automationSchema } from './AutomationSchema';

// #endregion

interface IPayloadRow {
  payload: string;
}

/**
 * Persists only automation-owned state through the shared SQLite connection.
 *
 * @public
 */
export class SqliteAutomationRepository implements IAutomationRepository {
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
    this._database.exec(automationSchema);
  }

  /**
   * Saves the automation receipt.
   *
   * @param receipt - Receipt.
   * @public
   */
  public saveAutomationReceipt(receipt: IAutomationReceipt): void {
    this._database
      .prepare(
        `INSERT INTO automation_receipts(signal_id, payload, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(signal_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      )
      .run(receipt.signalId, JSON.stringify(receipt), receipt.updatedAt);
  }

  /**
   * Lists the automation receipts.
   *
   * @public
   */
  public listAutomationReceipts(): readonly IAutomationReceipt[] {
    const rows = this._database
      .prepare('SELECT payload FROM automation_receipts ORDER BY updated_at ASC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IAutomationReceipt);
  }

  /**
   * Saves the automation checkpoint.
   *
   * @param checkpoint - Checkpoint.
   * @public
   */
  public saveAutomationCheckpoint(checkpoint: IAutomationSourceCheckpoint): void {
    this._database
      .prepare(
        `INSERT INTO automation_checkpoints(source_id, payload, initialized_at) VALUES (?, ?, ?)
         ON CONFLICT(source_id) DO UPDATE SET payload = excluded.payload,
           initialized_at = excluded.initialized_at`,
      )
      .run(
        `${checkpoint.workspaceId}:${checkpoint.sourceId}`,
        JSON.stringify(checkpoint),
        checkpoint.initializedAt,
      );
  }

  /**
   * Lists the automation checkpoints.
   *
   * @public
   */
  public listAutomationCheckpoints(): readonly IAutomationSourceCheckpoint[] {
    const rows = this._database
      .prepare('SELECT payload FROM automation_checkpoints ORDER BY initialized_at ASC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IAutomationSourceCheckpoint);
  }

  /**
   * Saves the agentic delivery.
   *
   * @param record - Record.
   * @public
   */
  public saveAgenticDelivery(record: IAgenticDeliveryRecord): void {
    this._database
      .prepare(
        `INSERT INTO agentic_deliveries(id, payload, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      )
      .run(record.id, JSON.stringify(record), record.updatedAt);
  }

  /**
   * Lists the agentic deliveries.
   *
   * @public
   */
  public listAgenticDeliveries(): readonly IAgenticDeliveryRecord[] {
    const rows = this._database
      .prepare('SELECT payload FROM agentic_deliveries ORDER BY updated_at ASC')
      .all() as unknown as IPayloadRow[];
    return rows.map((row) => JSON.parse(row.payload) as IAgenticDeliveryRecord);
  }

  // #endregion
}
