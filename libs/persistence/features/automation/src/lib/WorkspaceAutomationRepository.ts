// #region Imports

import type { IAutomationRepository } from '@symphony/application-automation';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import { SqliteAutomationRepository } from './SqliteAutomationRepository';

// #endregion

/**
 * Routes automation-owned records through their immutable workspace databases.
 *
 * @public
 */
export class WorkspaceAutomationRepository implements IAutomationRepository {
  // #region Ctor

  /**
   * Routes this feature through the shared workspace connection registry.
   *
   * @param _registry - Configured workspace paths and connection lifecycle.
   * @param _legacy - Existing pre-workspace database view, when configured.
   * @public
   */
  public constructor(
    private readonly _registry: WorkspaceDatabaseRegistry,
    private readonly _legacy?: SqliteAutomationRepository,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Saves the automation receipt.
   *
   * @param receipt - Receipt.
   * @public
   */
  public saveAutomationReceipt(receipt: IAutomationReceipt): void {
    this.repositoryFor(receipt.workspaceId).saveAutomationReceipt(receipt);
  }

  /**
   * Lists the automation receipts.
   *
   * @public
   */
  public listAutomationReceipts(): readonly IAutomationReceipt[] {
    const receipts = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listAutomationReceipts()),
      ...(this._legacy?.listAutomationReceipts() ?? []),
    ];
    const unique = new Map(receipts.map((receipt) => [receipt.signalId, receipt]));
    return [...unique.values()].sort((left, right) =>
      left.updatedAt.localeCompare(right.updatedAt),
    );
  }

  /**
   * Saves the automation checkpoint.
   *
   * @param checkpoint - Checkpoint.
   * @public
   */
  public saveAutomationCheckpoint(checkpoint: IAutomationSourceCheckpoint): void {
    this.repositoryFor(checkpoint.workspaceId).saveAutomationCheckpoint(checkpoint);
  }

  /**
   * Lists the automation checkpoints.
   *
   * @public
   */
  public listAutomationCheckpoints(): readonly IAutomationSourceCheckpoint[] {
    const checkpoints = [
      ...this.workspaceRepositories().flatMap((repository) =>
        repository.listAutomationCheckpoints(),
      ),
      ...(this._legacy?.listAutomationCheckpoints() ?? []),
    ];
    const unique = new Map(
      checkpoints.map((checkpoint) => [
        `${checkpoint.workspaceId}:${checkpoint.sourceId}`,
        checkpoint,
      ]),
    );
    return [...unique.values()].sort((left, right) =>
      left.initializedAt.localeCompare(right.initializedAt),
    );
  }

  /**
   * Saves the agentic delivery.
   *
   * @param record - Record.
   * @public
   */
  public saveAgenticDelivery(record: IAgenticDeliveryRecord): void {
    this.repositoryFor(record.workspaceId).saveAgenticDelivery(record);
  }

  /**
   * Lists the agentic deliveries.
   *
   * @public
   */
  public listAgenticDeliveries(): readonly IAgenticDeliveryRecord[] {
    const records = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listAgenticDeliveries()),
      ...(this._legacy?.listAgenticDeliveries() ?? []),
    ];
    const unique = new Map(records.map((record) => [record.id, record]));
    return [...unique.values()].sort((left, right) =>
      left.updatedAt.localeCompare(right.updatedAt),
    );
  }

  private workspaceRepositories(): readonly SqliteAutomationRepository[] {
    return this._registry.workspaceIds().map((workspaceId) => this.repositoryFor(workspaceId));
  }

  private repositoryFor(workspaceId: string): SqliteAutomationRepository {
    return new SqliteAutomationRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}
