// #region Imports

import type { DatabaseSync } from 'node:sqlite';
import type {
  IAgentAccountCooldownRepository,
  IAgentRouteTelemetryRepository,
} from '@symphony/application-ai';
import type { IAgentAccountCooldown, IAgentRouteTelemetry } from '@symphony/domain-ai';
import type { SqliteDatabase } from '@symphony/persistence-core';
import { agentRouteTelemetrySchema } from './AgentRouteTelemetrySchema';

// #endregion

interface IPayloadRow {
  readonly payload: string;
}

/**
 * Persists route telemetry and cooldowns through the shared workspace connection.
 *
 * @public
 */
export class SqliteAgentRouteTelemetryRepository
  implements IAgentRouteTelemetryRepository, IAgentAccountCooldownRepository
{
  // #region Fields

  private readonly _database: DatabaseSync;

  // #endregion

  // #region Ctor

  /**
   * Binds the existing connection and its transaction lifecycle.
   *
   * @param _connection - Shared SQLite database owner.
   * @public
   */
  public constructor(private readonly _connection: SqliteDatabase) {
    this._database = _connection.connection;
  }

  // #endregion

  // #region Methods

  /**
   * Applies the unchanged AI persistence schema for independent adapter use.
   *
   * @public
   */
  public initialize(): void {
    this._database.exec(agentRouteTelemetrySchema);
  }

  /**
   * Loads.
   *
   * @param workspaceId - Workspace id.
   * @param routeCandidateId - Route candidate id.
   * @public
   */
  public load(workspaceId: string, routeCandidateId: string): IAgentRouteTelemetry | undefined {
    const row = this._database
      .prepare(
        'SELECT payload FROM agent_route_telemetry WHERE workspace_id = ? AND route_candidate_id = ?',
      )
      .get(workspaceId, routeCandidateId) as IPayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as IAgentRouteTelemetry) : undefined;
  }

  /**
   * Saves.
   *
   * @param telemetry - Telemetry.
   * @public
   */
  public save(telemetry: IAgentRouteTelemetry): void {
    this._database
      .prepare(
        `INSERT INTO agent_route_telemetry(
           workspace_id, route_candidate_id, payload, updated_at
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(workspace_id, route_candidate_id) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`,
      )
      .run(
        telemetry.workspaceId,
        telemetry.routeCandidateId,
        JSON.stringify(telemetry),
        telemetry.lastAttemptAt ?? new Date(0).toISOString(),
      );
  }

  /**
   * Loads the account cooldown.
   *
   * @param workspaceId - Workspace id.
   * @param aiConnectionId - Ai connection id.
   * @public
   */
  public loadAccountCooldown(
    workspaceId: string,
    aiConnectionId: string,
  ): IAgentAccountCooldown | undefined {
    const row = this._database
      .prepare(
        'SELECT payload FROM agent_account_cooldowns WHERE workspace_id = ? AND ai_connection_id = ?',
      )
      .get(workspaceId, aiConnectionId) as IPayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as IAgentAccountCooldown) : undefined;
  }

  /**
   * Saves the account cooldown.
   *
   * @param cooldown - Cooldown.
   * @public
   */
  public saveAccountCooldown(cooldown: IAgentAccountCooldown): void {
    this._database
      .prepare(
        `INSERT INTO agent_account_cooldowns(
           workspace_id, ai_connection_id, payload, retry_at
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(workspace_id, ai_connection_id) DO UPDATE SET
           payload = excluded.payload,
           retry_at = excluded.retry_at`,
      )
      .run(
        cooldown.workspaceId,
        cooldown.aiConnectionId,
        JSON.stringify(cooldown),
        cooldown.retryAt,
      );
  }

  /**
   * Clears the account cooldown.
   *
   * @param workspaceId - Workspace id.
   * @param aiConnectionId - Ai connection id.
   * @public
   */
  public clearAccountCooldown(workspaceId: string, aiConnectionId: string): void {
    this._database
      .prepare(
        'DELETE FROM agent_account_cooldowns WHERE workspace_id = ? AND ai_connection_id = ?',
      )
      .run(workspaceId, aiConnectionId);
  }

  /**
   * Clears the workspace account cooldowns.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public clearWorkspaceAccountCooldowns(workspaceId: string): void {
    this._database
      .prepare('DELETE FROM agent_account_cooldowns WHERE workspace_id = ?')
      .run(workspaceId);
  }

  /**
   * Removes the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public removeWorkspace(workspaceId: string): void {
    this._connection.immediateTransaction(() => {
      this._database
        .prepare('DELETE FROM agent_route_telemetry WHERE workspace_id = ?')
        .run(workspaceId);
      this.clearWorkspaceAccountCooldowns(workspaceId);
    });
  }

  // #endregion
}
