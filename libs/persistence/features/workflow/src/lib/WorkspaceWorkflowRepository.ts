// #region Imports

import type {
  IWorkflowRecordRepository,
  IWorkflowStageChangeQuery,
  IWorkflowStageHistoryRepository,
} from '@symphony/application-workflow';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import type {
  IWorkflowAuditEntry,
  IWorkflowRecord,
  IWorkflowStageChangeHistory,
} from '@symphony/domain-workflow';
import { SqliteWorkflowRepository } from './SqliteWorkflowRepository';

// #endregion

/**
 * Routes workflow-owned records through their immutable workspace databases.
 *
 * @public
 */
export class WorkspaceWorkflowRepository
  implements IWorkflowRecordRepository, IWorkflowStageHistoryRepository
{
  // #region Fields

  private readonly _workflowWorkspaces = new Map<string, string>();

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
    private readonly _legacy?: SqliteWorkflowRepository,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Returns the workflow record.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public workflowRecord(workItemId: string): IWorkflowRecord | undefined {
    const known = this._workflowWorkspaces.get(workItemId);
    if (known) return this.repositoryFor(known).workflowRecord(workItemId);
    for (const repository of this.workspaceRepositories()) {
      const record = repository.workflowRecord(workItemId);
      if (record) {
        this._workflowWorkspaces.set(workItemId, record.workspaceId);
        return record;
      }
    }
    return this._legacy?.workflowRecord(workItemId);
  }

  /**
   * Lists the workflow records.
   *
   * @public
   */
  public listWorkflowRecords(): readonly IWorkflowRecord[] {
    const records = [
      ...this.workspaceRepositories().flatMap((repository) => repository.listWorkflowRecords()),
      ...(this._legacy?.listWorkflowRecords() ?? []),
    ];
    const unique = new Map(records.map((record) => [record.workItemId, record]));
    for (const record of unique.values()) {
      this._workflowWorkspaces.set(record.workItemId, record.workspaceId);
    }
    return [...unique.values()];
  }

  /**
   * Saves the workflow record.
   *
   * @param record - Record.
   * @public
   */
  public saveWorkflowRecord(record: IWorkflowRecord): void {
    this.repositoryFor(record.workspaceId).saveWorkflowRecord(record);
    this._workflowWorkspaces.set(record.workItemId, record.workspaceId);
  }

  /**
   * Saves the workflow audit.
   *
   * @param entry - Entry.
   * @public
   */
  public saveWorkflowAudit(entry: IWorkflowAuditEntry): void {
    const workspaceId = this._workflowWorkspaces.get(entry.workItemId);
    if (workspaceId) {
      this.repositoryFor(workspaceId).saveWorkflowAudit(entry);
      return;
    }
    if (!this._legacy) {
      throw new Error(`Cannot resolve workspace for workflow audit entry ${entry.id}.`);
    }
    this._legacy.saveWorkflowAudit(entry);
  }

  /**
   * Lists the workflow audit.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public listWorkflowAudit(workItemId: string): readonly IWorkflowAuditEntry[] {
    const workspaceId = this._workflowWorkspaces.get(workItemId);
    if (workspaceId) return this.repositoryFor(workspaceId).listWorkflowAudit(workItemId);
    const entries = [
      ...this.workspaceRepositories().flatMap((repository) =>
        repository.listWorkflowAudit(workItemId),
      ),
      ...(this._legacy?.listWorkflowAudit(workItemId) ?? []),
    ];
    return entries.sort((left, right) => left.sequence - right.sequence);
  }

  /**
   * Lists the recorded stage changes of the scope from the scoped workspace databases and the
   * pre-workspace database, newest first and at most `limit` of them.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The changes and the instant from which they are complete.
   * @public
   */
  public listStageChanges(query: IWorkflowStageChangeQuery): IWorkflowStageChangeHistory {
    const configured = new Set(this._registry.workspaceIds());
    const sources = [
      ...query.workspaceIds
        .filter((workspaceId) => configured.has(workspaceId))
        .map((workspaceId) => this.repositoryFor(workspaceId).listStageChanges(query)),
      ...(this._legacy ? [this._legacy.listStageChanges(query)] : []),
    ];
    const merged = sources
      .flatMap((source) => source.changes)
      .toSorted((left, right) => right.changedAt.localeCompare(left.changedAt));
    const kept = merged.slice(0, query.limit);
    const cut = merged.length > query.limit;
    const truncatedAt = [
      ...sources.flatMap((source) =>
        source.truncated && source.recordedSince ? [source.recordedSince] : [],
      ),
      ...(cut && kept.length ? [kept.at(-1)!.changedAt] : []),
    ].toSorted();
    const earliest = sources
      .flatMap((source) => (source.recordedSince ? [source.recordedSince] : []))
      .toSorted()[0];
    const recordedSince = truncatedAt.length ? truncatedAt.at(-1) : earliest;
    return {
      changes: kept,
      ...(recordedSince ? { recordedSince } : {}),
      truncated: truncatedAt.length > 0,
    };
  }

  /**
   * Returns the next workflow audit sequence.
   *
   * @public
   */
  public nextWorkflowAuditSequence(): number {
    const sequences = [
      ...this.workspaceRepositories().map((repository) => repository.nextWorkflowAuditSequence()),
      ...(this._legacy ? [this._legacy.nextWorkflowAuditSequence()] : []),
    ];
    return sequences.length ? Math.max(...sequences) : 1;
  }

  private workspaceRepositories(): readonly SqliteWorkflowRepository[] {
    return this._registry.workspaceIds().map((workspaceId) => this.repositoryFor(workspaceId));
  }

  private repositoryFor(workspaceId: string): SqliteWorkflowRepository {
    return new SqliteWorkflowRepository(this._registry.databaseFor(workspaceId), workspaceId);
  }

  // #endregion
}
