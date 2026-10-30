// #region Imports

import { computed, Injectable, signal } from '@angular/core';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type {
  ApplicationSettingsDto,
  ConnectionStatusDto,
} from '@symphony/ipc-contracts-composition';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';

// #endregion

/**
 * Writable application state shared by the focused orchestration collaborators.
 *
 * This class is package-internal. Public projections expose the same signals as read-only
 * values; the transport synchronizer and configuration writer own their mutations.
 */
@Injectable({ providedIn: 'root' })
export class OrchestrationState {
  // #region Fields

  /**
   * Current orchestration snapshot.
   *
   * @public
   * @readonly
   */
  public readonly snapshot = signal<IOrchestrationSnapshot | undefined>(undefined);

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public readonly loading = signal(true);

  /**
   * The settings.
   *
   * @public
   * @readonly
   */
  public readonly settings = signal<ApplicationSettingsDto | undefined>(undefined);

  /**
   * The runtime health.
   *
   * @public
   * @readonly
   */
  public readonly runtimeHealth = computed(() => this.snapshot()?.health);

  /**
   * The storage status.
   *
   * @public
   * @readonly
   */
  public readonly storageStatus = signal<StorageStatusDto | undefined>(undefined);

  /**
   * The connections.
   *
   * @public
   * @readonly
   */
  public readonly connections = signal<ConnectionStatusDto | undefined>(undefined);

  /**
   * The configuration busy.
   *
   * @public
   * @readonly
   */
  public readonly configurationBusy = signal(false);

  /**
   * The selected workspace IDs.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkspaceIds = computed(
    () => this.settings()?.activeViewScope.workspaceIds ?? [],
  );

  /**
   * The active workspace.
   *
   * @public
   * @readonly
   */
  public readonly activeWorkspace = computed(() => {
    const settings = this.settings();
    return settings?.workspaces.find(
      (workspace) => workspace.id === settings.activeViewScope.workspaceIds[0],
    );
  });

  /**
   * Enabled work-item sources (boards) inside the selected workspaces, in workspace order.
   *
   * @public
   * @readonly
   */
  public readonly availableBoards = computed(() => {
    const settings = this.settings();
    if (!settings) return [];
    const order = new Map(settings.workspaces.map((workspace, index) => [workspace.id, index]));
    const selected = new Set(settings.activeViewScope.workspaceIds);
    return settings.workItemSources
      .filter((source) => source.enabled && selected.has(source.workspaceId))
      .toSorted(
        (left, right) =>
          (order.get(left.workspaceId) ?? 0) - (order.get(right.workspaceId) ?? 0) ||
          left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' }),
      );
  });

  /**
   * Board the board view shows; undefined shows every board in scope.
   *
   * @public
   * @readonly
   */
  public readonly activeBoard = computed(() => {
    const boards = this.availableBoards();
    const selectedId = this.settings()?.activeViewScope.workItemSourceId;
    return boards.find((board) => board.id === selectedId);
  });

  /**
   * Work items of the active board, or of every board in scope; home and board share this.
   *
   * @public
   * @readonly
   */
  public readonly scopedWorkItems = computed(() => {
    const board = this.activeBoard();
    const selectedWorkspaceIds = new Set(this.selectedWorkspaceIds());
    const acceptsLegacyItems = (this.settings()?.workspaces.length ?? 0) === 1;
    const items = (this.snapshot()?.workItems ?? []).filter((item) =>
      item.workspaceId ? selectedWorkspaceIds.has(item.workspaceId) : acceptsLegacyItems,
    );
    return board ? items.filter((item) => item.sourceId === board.id) : items;
  });

  /**
   * Board that owns newly created work items: the selected board, else the only board in scope.
   *
   * @public
   * @readonly
   */
  public readonly creationBoard = computed(() => {
    const boards = this.availableBoards();
    return this.activeBoard() ?? (boards.length === 1 ? boards[0] : undefined);
  });

  /**
   * Enabled repository bindings inside the selected workspaces.
   *
   * @public
   * @readonly
   */
  public readonly scopedRepositories = computed(() => {
    const selected = new Set(this.selectedWorkspaceIds());
    return (
      this.settings()?.repositoryBindings.filter(
        (repository) => repository.enabled && selected.has(repository.workspaceId),
      ) ?? []
    );
  });

  /**
   * Whether a new work item has a board to land on: one board is selected, or the single selected
   * workspace has no board yet and the first one is about to be created. Home and the board share
   * this so a "New" affordance is never offered on one surface and refused on the other.
   *
   * @public
   * @readonly
   */
  public readonly canCreateWorkItem = computed(
    () =>
      Boolean(this.creationBoard()) ||
      (this.selectedWorkspaceIds().length === 1 && this.availableBoards().length === 0),
  );

  /**
   * Whether a new pull request has a repository to land on; only GitHub repositories in the
   * selected workspaces can receive one.
   *
   * @public
   * @readonly
   */
  public readonly canCreatePullRequest = computed(() =>
    this.scopedRepositories().some((repository) => repository.provider === 'github'),
  );
  // #endregion
}
