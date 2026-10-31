// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import {
  WORKSPACE_REFRESH_PARTICIPANTS,
  type IWorkspaceRefreshParticipant,
} from '@symphony/frontend-core';
import type { IWorkspaceScope } from '@symphony/frontend-core/workspace';
import type { IWorkspaceConfiguration } from '../ports/IWorkspaceConfiguration';
import type { IWorkspaceContext } from '../ports/IWorkspaceContext';
import type { IWorkspaceRefresh } from '../ports/IWorkspaceRefresh';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_CONTEXT } from '../ports/WorkspaceContextToken';
import { WORKSPACE_REFRESH } from '../ports/WorkspaceRefreshToken';

// #endregion

/**
 * Owns workspace and board scope transitions through the existing aggregate settings writer.
 *
 * @public
 */
@Injectable()
export class WorkspaceSelectionStore implements IWorkspaceScope {
  // #region Fields

  private readonly _context: IWorkspaceContext;
  private readonly _configuration: IWorkspaceConfiguration;
  private readonly _refresh: IWorkspaceRefresh;
  private readonly _refreshParticipants: readonly IWorkspaceRefreshParticipant[];

  // #endregion

  // #region Ctor

  /**
   * Connects scope projection, validated save and existing refresh sequencing.
   *
   * @public
   */
  public constructor(
    @Inject(WORKSPACE_CONTEXT) context: IWorkspaceContext = inject(WORKSPACE_CONTEXT),
    @Inject(WORKSPACE_CONFIGURATION)
    configuration: IWorkspaceConfiguration = inject(WORKSPACE_CONFIGURATION),
    @Inject(WORKSPACE_REFRESH) refresh: IWorkspaceRefresh = inject(WORKSPACE_REFRESH),
    @Inject(WORKSPACE_REFRESH_PARTICIPANTS)
    @Optional()
    refreshParticipants: readonly IWorkspaceRefreshParticipant[] | null = inject(
      WORKSPACE_REFRESH_PARTICIPANTS,
      { optional: true },
    ),
  ) {
    this._context = context;
    this._configuration = configuration;
    this._refresh = refresh;
    this._refreshParticipants = refreshParticipants ?? [];
  }

  // #endregion

  // #region Methods

  /**
   * Selects the workspace scope.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async selectWorkspaceScope(workspaceId: string): Promise<void> {
    const current = this._context.settings();
    if (!current) return;
    const knownIds = new Set(
      current.workspaces.filter((workspace) => workspace.enabled).map((workspace) => workspace.id),
    );
    if (!knownIds.has(workspaceId)) return;
    if (current.activeViewScope.workspaceIds[0] === workspaceId) return;
    const selectedBoard = current.workItemSources.find(
      (source) =>
        source.id === current.activeViewScope.workItemSourceId &&
        source.workspaceId === workspaceId,
    );
    if (
      await this._configuration.saveSettings(
        {
          ...current,
          activeViewScope: {
            ...current.activeViewScope,
            workspaceIds: [workspaceId],
            savedViewId: undefined,
            workItemSourceId: selectedBoard?.id,
          },
        },
        false,
      )
    ) {
      await this._refresh.loadCachedSnapshotForWorkspace(workspaceId);
      await Promise.all([
        this._refresh.refresh(),
        ...this._refreshParticipants.map((participant) => participant.refresh()),
        this._configuration.refreshContinuousIntegrationUsage(undefined, true),
      ]);
    }
  }

  /**
   * Selects the source.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async selectSource(workspaceId: string): Promise<void> {
    await this.selectWorkspaceScope(workspaceId);
  }

  /**
   * Persists which board the board view shows; `undefined` shows every board in scope.
   *
   * @param sourceId - Source id.
   * @public
   */
  public async selectBoard(sourceId: string | undefined): Promise<void> {
    const current = this._context.settings();
    if (!current) return;
    const selected = sourceId
      ? this._context.availableBoards().find((board) => board.id === sourceId)?.id
      : undefined;
    if (selected === current.activeViewScope.workItemSourceId) return;
    await this._configuration.saveSettings(
      {
        ...current,
        activeViewScope: { ...current.activeViewScope, workItemSourceId: selected },
      },
      false,
    );
  }

  // #endregion
}
