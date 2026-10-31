// #region Imports

import { Injectable, signal } from '@angular/core';
import type { GlobalSettingsSection } from '../models/GlobalSettingsSection';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';

// #endregion

/**
 * Owns selection for one Settings route without changing the active application workspace scope.
 *
 * @public
 */
@Injectable()
export class SettingsHostSession {
  // #region Fields

  private readonly _workspaceId = signal<string | null>(null);
  private readonly _globalSection = signal<GlobalSettingsSection>('workspaces');
  private readonly _workspaceSection = signal<WorkspaceSettingsSection>('team');
  private readonly _searchQuery = signal('');
  private _knownWorkspaceIds: readonly string[] = [];
  private _initialized = false;
  /**
   * Workspace whose configuration is being edited.
   *
   * @public
   * @readonly
   */
  public readonly workspaceId = this._workspaceId.asReadonly();
  /**
   * Selected installation-level section.
   *
   * @public
   * @readonly
   */
  public readonly globalSection = this._globalSection.asReadonly();
  /**
   * Selected section within the configured workspace.
   *
   * @public
   * @readonly
   */
  public readonly workspaceSection = this._workspaceSection.asReadonly();
  /**
   * Text typed into `Search settings`; while it is not blank the window lists matching settings
   * instead of a section.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = this._searchQuery.asReadonly();

  // #endregion

  // #region Methods

  /**
   * Opens a workspace without changing its application execution scope.
   *
   * @public
   */
  public openWorkspace(workspaceId: string, section: WorkspaceSettingsSection = 'team'): void {
    this._workspaceId.set(workspaceId);
    this._globalSection.set('workspaces');
    this._workspaceSection.set(section);
    this._searchQuery.set('');
  }

  /**
   * Selects an installation section and leaves the workspace being configured.
   *
   * @public
   */
  public selectGlobal(section: GlobalSettingsSection): void {
    this._workspaceId.set(null);
    this._globalSection.set(section);
    this._searchQuery.set('');
  }

  /**
   * Selects a section within the current workspace.
   *
   * @public
   */
  public selectWorkspaceSection(section: WorkspaceSettingsSection): void {
    this._workspaceSection.set(section);
    this._searchQuery.set('');
  }

  /**
   * Changes the `Search settings` query; a blank query returns to the selected section.
   *
   * @public
   */
  public search(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Selects the first included section when the currently selected feature is omitted.
   *
   * @public
   */
  public reconcileSections(
    global: readonly GlobalSettingsSection[],
    workspace: readonly WorkspaceSettingsSection[],
  ): void {
    const globalFallback = global[0];
    if (globalFallback && !global.includes(this._globalSection()))
      this._globalSection.set(globalFallback);
    const workspaceFallback = workspace[0];
    if (workspaceFallback && !workspace.includes(this._workspaceSection()))
      this._workspaceSection.set(workspaceFallback);
  }

  /**
   * Reconciles added and deleted workspaces after the authoritative configuration changes.
   *
   * @public
   */
  public reconcileWorkspaces(workspaceIds: readonly string[]): void {
    const added = workspaceIds.find((id) => !this._knownWorkspaceIds.includes(id));
    if (this._initialized && added) this.openWorkspace(added);
    else if (this._workspaceId() !== null && !workspaceIds.some((id) => id === this._workspaceId()))
      this._workspaceId.set(null);
    this._knownWorkspaceIds = [...workspaceIds];
    this._initialized = true;
  }

  // #endregion
}
