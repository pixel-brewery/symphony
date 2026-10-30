// #region Imports

import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteExecutionRepository } from '@symphony/persistence-execution';
import { SqliteWorkflowRepository } from '@symphony/persistence-workflow';
import { SqliteAutomationRepository } from '@symphony/persistence-automation';
import { operationalSchemas } from './OperationalSchemas';

// #endregion

/**
 * Composes narrow feature repositories over one operational database connection.
 *
 * @public
 */
export class SqliteOperationalRepositories {
  // #region Fields

  /**
   * Shared connection and transaction lifecycle.
   *
   * @public
   * @readonly
   */
  public readonly database: SqliteDatabase;

  /**
   * Execution, event, delivery-group, goal and queue persistence.
   *
   * @public
   * @readonly
   */
  public readonly execution: SqliteExecutionRepository;

  /**
   * Workflow records and their append-only audit trail.
   *
   * @public
   * @readonly
   */
  public readonly workflow: SqliteWorkflowRepository;

  /**
   * Automation receipts, source checkpoints and recovery journals.
   *
   * @public
   * @readonly
   */
  public readonly automation: SqliteAutomationRepository;

  // #endregion

  // #region Ctor

  /**
   * Uses an existing shared connection or opens the legacy database path once.
   *
   * @param database - Existing connection owner or configured legacy path.
   * @public
   */
  public constructor(database: string | SqliteDatabase) {
    this.database = typeof database === 'string' ? new SqliteDatabase(database) : database;
    this.execution = new SqliteExecutionRepository(this.database);
    this.workflow = new SqliteWorkflowRepository(this.database);
    this.automation = new SqliteAutomationRepository(this.database);
  }

  // #endregion

  // #region Methods

  /**
   * Applies the unchanged feature schemas in their original initialization order.
   *
   * @public
   */
  public initialize(): void {
    for (const schema of operationalSchemas) this.database.connection.exec(schema);
  }

  /**
   * Deletes the workspace data.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public deleteWorkspaceData(workspaceId: string): void {
    const executionIds = this.execution
      .listExecutions()
      .filter((execution) => execution.workspaceId === workspaceId)
      .map((execution) => execution.id);
    const receiptIds = this.automation
      .listAutomationReceipts()
      .filter((receipt) => receipt.workspaceId === workspaceId)
      .map((receipt) => receipt.signalId);
    const checkpointIds = this.automation
      .listAutomationCheckpoints()
      .filter((checkpoint) => checkpoint.workspaceId === workspaceId)
      .map((checkpoint) => `${checkpoint.workspaceId}:${checkpoint.sourceId}`);
    const deliveryIds = this.automation
      .listAgenticDeliveries()
      .filter((record) => record.workspaceId === workspaceId)
      .map((record) => record.id);
    const deliveryGroupIds = this.execution
      .listDeliveryGroups()
      .filter((group) => group.workspaceId === workspaceId)
      .map((group) => group.id);
    const deliveryGroupProposalIds = this.execution
      .listDeliveryGroupProposals()
      .filter((proposal) => proposal.workspaceId === workspaceId)
      .map((proposal) => proposal.id);
    const goalIds = this.execution
      .listGoals()
      .filter((goal) => goal.workspaceId === workspaceId)
      .map((goal) => goal.id);
    const queueEntryIds = this.execution
      .listExecutionQueue()
      .filter((entry) => entry.workspaceId === workspaceId)
      .map((entry) => entry.id);
    const deleteEvents = this.database.connection.prepare(
      'DELETE FROM execution_events WHERE execution_id = ?',
    );
    const deleteExecution = this.database.connection.prepare('DELETE FROM executions WHERE id = ?');
    const deleteReceipt = this.database.connection.prepare(
      'DELETE FROM automation_receipts WHERE signal_id = ?',
    );
    const deleteCheckpoint = this.database.connection.prepare(
      'DELETE FROM automation_checkpoints WHERE source_id = ?',
    );
    const deleteDelivery = this.database.connection.prepare(
      'DELETE FROM agentic_deliveries WHERE id = ?',
    );
    const deleteDeliveryGroupMembers = this.database.connection.prepare(
      'DELETE FROM delivery_group_members WHERE group_id = ?',
    );
    const deleteDeliveryGroup = this.database.connection.prepare(
      'DELETE FROM delivery_groups WHERE id = ?',
    );
    const deleteDeliveryGroupProposal = this.database.connection.prepare(
      'DELETE FROM delivery_group_proposals WHERE id = ?',
    );
    const deleteGoal = this.database.connection.prepare('DELETE FROM goals WHERE id = ?');
    const deleteQueueEntry = this.database.connection.prepare(
      'DELETE FROM execution_queue WHERE id = ?',
    );

    this.database.immediateTransaction(() => {
      for (const executionId of executionIds) {
        deleteEvents.run(executionId);
        deleteExecution.run(executionId);
      }
      for (const signalId of receiptIds) deleteReceipt.run(signalId);
      for (const sourceId of checkpointIds) deleteCheckpoint.run(sourceId);
      for (const deliveryId of deliveryIds) deleteDelivery.run(deliveryId);
      for (const groupId of deliveryGroupIds) {
        deleteDeliveryGroupMembers.run(groupId);
        deleteDeliveryGroup.run(groupId);
      }
      for (const proposalId of deliveryGroupProposalIds)
        deleteDeliveryGroupProposal.run(proposalId);
      for (const goalId of goalIds) deleteGoal.run(goalId);
      for (const entryId of queueEntryIds) deleteQueueEntry.run(entryId);
    });
  }

  /**
   * Closes the database after all composed feature users have finished.
   *
   * @public
   */
  public close(): void {
    this.database.close();
  }

  // #endregion
}
