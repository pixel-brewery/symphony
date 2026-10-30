// #region Imports

import type {
  IAgentAccountCooldownRepository,
  IAgentRouteTelemetryRepository,
} from '@symphony/application-ai';
import type { IAgentAccountCooldown, IAgentRouteTelemetry } from '@symphony/domain-ai';
import type { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { SqliteAgentRouteTelemetryRepository } from './SqliteAgentRouteTelemetryRepository';

// #endregion

/**
 * Routes adaptive route memory through the existing shared workspace boundary.
 *
 * @public
 */
export class WorkspaceAgentRouteTelemetryRepository
  implements IAgentRouteTelemetryRepository, IAgentAccountCooldownRepository
{
  // #region Ctor

  /**
   * Uses the registry whose schemas were registered by composition.
   *
   * @param _registry - Shared workspace storage owner.
   * @public
   */
  public constructor(private readonly _registry: WorkspaceDatabaseRegistry) {}

  // #endregion

  // #region Methods

  /**
   * Opens configured workspace storage after composition registered its schemas.
   *
   * @public
   */
  public initialize(): void {
    this._registry.initialize();
  }

  /**
   * Loads.
   *
   * @param workspaceId - Workspace id.
   * @param routeCandidateId - Route candidate id.
   * @public
   */
  public load(workspaceId: string, routeCandidateId: string): IAgentRouteTelemetry | undefined {
    return this.repositoryFor(workspaceId).load(workspaceId, routeCandidateId);
  }

  /**
   * Saves.
   *
   * @param telemetry - Telemetry.
   * @public
   */
  public save(telemetry: IAgentRouteTelemetry): void {
    this.repositoryFor(telemetry.workspaceId).save(telemetry);
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
    return this.repositoryFor(workspaceId).loadAccountCooldown(workspaceId, aiConnectionId);
  }

  /**
   * Saves the account cooldown.
   *
   * @param cooldown - Cooldown.
   * @public
   */
  public saveAccountCooldown(cooldown: IAgentAccountCooldown): void {
    this.repositoryFor(cooldown.workspaceId).saveAccountCooldown(cooldown);
  }

  /**
   * Clears the account cooldown.
   *
   * @param workspaceId - Workspace id.
   * @param aiConnectionId - Ai connection id.
   * @public
   */
  public clearAccountCooldown(workspaceId: string, aiConnectionId: string): void {
    this.repositoryFor(workspaceId).clearAccountCooldown(workspaceId, aiConnectionId);
  }

  /**
   * Clears the workspace account cooldowns.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public clearWorkspaceAccountCooldowns(workspaceId: string): void {
    this.repositoryFor(workspaceId).clearWorkspaceAccountCooldowns(workspaceId);
  }

  /**
   * Removes the existing AI cleanup set without closing a borrowed connection.
   *
   * @param workspaceId - Workspace selected for cleanup.
   * @public
   */
  public removeWorkspace(workspaceId: string): void {
    const database = this._registry.existingFor(workspaceId);
    if (!database) return;
    new SqliteAgentRouteTelemetryRepository(database).removeWorkspace(workspaceId);
  }

  private repositoryFor(workspaceId: string): SqliteAgentRouteTelemetryRepository {
    return new SqliteAgentRouteTelemetryRepository(this._registry.databaseFor(workspaceId));
  }

  // #endregion
}
