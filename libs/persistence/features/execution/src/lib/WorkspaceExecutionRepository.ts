// #region Imports

import type { IExecutionRepository } from '@symphony/application-execution';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';
import { SqliteExecutionRepository } from './SqliteExecutionRepository';

// #endregion

/**
 * Routes execution-owned records through their immutable workspace databases.
 *
 * @public
 */
export class WorkspaceExecutionRepository implements IExecutionRepository {
  // #region Fields

  private readonly _executionWorkspaces = new Map<string, string>();

  // #endregion

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
    private readonly _legacy?: SqliteExecutionRepository,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Indexes existing execution ownership after composition initializes the schemas.
   *
   * @public
   */
  public initialize(): void {
    this._registry.initialize();
    this.indexExecutions();
  }

  /**
   * Saves the execution.
   *
   * @param execution - Execution.
   * @public
   */
  public saveExecution(execution: IExecutionRecord): void {
    const workspaceId = execution.workspaceId;
    if (!workspaceId) {
      if (!this._legacy) throw new Error('Executions require an immutable workspace ID.');
      this._legacy.saveExecution(execution);
      return;
    }
    this.repositoryFor(workspaceId).saveExecution(execution);
    this._executionWorkspaces.set(execution.id, workspaceId);
  }

  /**
   * Saves the event.
   *
   * @param event - Event.
   * @public
   */
  public saveEvent(event: IExecutionEvent): void {
    const workspaceId =
      this._executionWorkspaces.get(event.executionId) ?? this.findWorkspace(event.executionId);
    if (workspaceId) {
      this.repositoryFor(workspaceId).saveEvent(event);
      return;
    }
    if (!this._legacy) throw new Error(`Cannot resolve workspace for execution event ${event.id}.`);
    this._legacy.saveEvent(event);
  }

  /**
   * Lists the executions.
   *
   * @public
   */
  public listExecutions(): readonly IExecutionRecord[] {
    const records = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listExecutions()),
      ...(this._legacy?.listExecutions() ?? []),
    ];
    const unique = new Map(records.map((record) => [record.id, record]));
    for (const execution of unique.values()) {
      if (execution.workspaceId) this._executionWorkspaces.set(execution.id, execution.workspaceId);
    }
    return [...unique.values()].sort((left, right) =>
      right.startedAt.localeCompare(left.startedAt),
    );
  }

  /**
   * Lists the events.
   *
   * @public
   */
  public listEvents(): readonly IExecutionEvent[] {
    const events = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listEvents()),
      ...(this._legacy?.listEvents() ?? []),
    ];
    const unique = new Map(events.map((event) => [event.id, event]));
    return [...unique.values()].sort((left, right) => left.sequence - right.sequence);
  }

  /**
   * Saves a delivery group in its owning workspace database.
   *
   * @param group - Delivery group.
   * @public
   */
  public saveDeliveryGroup(group: IDeliveryGroup): void {
    this.repositoryFor(group.workspaceId).saveDeliveryGroup(group);
  }

  /**
   * Lists delivery groups across configured workspace databases.
   *
   * @public
   */
  public listDeliveryGroups(): readonly IDeliveryGroup[] {
    const groups = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listDeliveryGroups()),
      ...(this._legacy?.listDeliveryGroups() ?? []),
    ];
    return [...new Map(groups.map((group) => [group.id, group])).values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  /**
   * Saves a proposal in its owning workspace database.
   *
   * @param proposal - Relationship proposal.
   * @public
   */
  public saveDeliveryGroupProposal(proposal: IDeliveryGroupProposal): void {
    this.repositoryFor(proposal.workspaceId).saveDeliveryGroupProposal(proposal);
  }

  /**
   * Lists delivery-group proposals across configured workspaces.
   *
   * @public
   */
  public listDeliveryGroupProposals(): readonly IDeliveryGroupProposal[] {
    const proposals = [
      ...this.workspaceRepositories().flatMap((repository) =>
        repository.listDeliveryGroupProposals(),
      ),
      ...(this._legacy?.listDeliveryGroupProposals() ?? []),
    ];
    return [...new Map(proposals.map((proposal) => [proposal.id, proposal])).values()].sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  /**
   * Saves the goal.
   *
   * @param goal - Goal.
   * @public
   */
  public saveGoal(goal: IGoalRecord): void {
    this.repositoryFor(goal.workspaceId).saveGoal(goal);
  }

  /**
   * Lists the goals.
   *
   * @public
   */
  public listGoals(): readonly IGoalRecord[] {
    const records = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listGoals()),
      ...(this._legacy?.listGoals() ?? []),
    ];
    return [...new Map(records.map((record) => [record.id, record])).values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  /**
   * Saves the execution queue entry.
   *
   * @param entry - Entry.
   * @public
   */
  public saveExecutionQueueEntry(entry: IExecutionQueueEntry): void {
    const workspaceId = entry.workspaceId;
    if (!workspaceId) {
      if (!this._legacy) {
        throw new Error('Queued executions require an immutable workspace ID.');
      }
      this._legacy.saveExecutionQueueEntry(entry);
      return;
    }
    this.repositoryFor(workspaceId).saveExecutionQueueEntry(entry);
  }

  /**
   * Entry IDs are unique across workspaces, so removal is broadcast rather than routed: the
   * operator withdraws an entry the surface knows only by ID, and looking the owner up first
   * would open every workspace database for the same result.
   *
   * @param entryId - Entry id.
   * @public
   */
  public removeExecutionQueueEntry(entryId: string): void {
    for (const repository of this.workspaceRepositories()) {
      repository.removeExecutionQueueEntry(entryId);
    }
    this._legacy?.removeExecutionQueueEntry(entryId);
  }

  /**
   * Lists the execution queue.
   *
   * @public
   */
  public listExecutionQueue(): readonly IExecutionQueueEntry[] {
    const entries = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listExecutionQueue()),
      ...(this._legacy?.listExecutionQueue() ?? []),
    ];
    return [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort((left, right) =>
      left.queuedAt.localeCompare(right.queuedAt),
    );
  }

  /**
   * Forgets routed execution identifiers after the owning workspace cleanup commits.
   *
   * @param workspaceId - Deleted workspace boundary.
   * @public
   */
  public forgetWorkspace(workspaceId: string): void {
    for (const [executionId, executionWorkspaceId] of this._executionWorkspaces) {
      if (executionWorkspaceId === workspaceId) this._executionWorkspaces.delete(executionId);
    }
  }

  private workspaceRepositories(): readonly SqliteExecutionRepository[] {
    return this._registry.workspaceIds().map((workspaceId) => this.repositoryFor(workspaceId));
  }

  private repositoryFor(workspaceId: string): SqliteExecutionRepository {
    return new SqliteExecutionRepository(this._registry.databaseFor(workspaceId));
  }

  private indexExecutions(): void {
    for (const execution of this.listExecutions()) {
      if (execution.workspaceId) this._executionWorkspaces.set(execution.id, execution.workspaceId);
    }
  }

  private findWorkspace(executionId: string): string | undefined {
    for (const workspaceId of this._registry.workspaceIds()) {
      if (
        this.repositoryFor(workspaceId)
          .listExecutions()
          .some((execution) => execution.id === executionId)
      ) {
        this._executionWorkspaces.set(executionId, workspaceId);
        return workspaceId;
      }
    }
    return undefined;
  }

  // #endregion
}
