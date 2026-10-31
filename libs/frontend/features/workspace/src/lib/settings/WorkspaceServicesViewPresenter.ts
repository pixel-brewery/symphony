// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { SETTINGS_WORKSPACE_CONTEXT, SettingsViewSlot } from '@symphony/frontend-setting';
import { WORKSPACE_SETTINGS_CONTEXT } from '../ports/WorkspaceSettingsContextToken';

// #endregion

/** Preserves one workspace Services card while native slots own each feature's content. @public */
@Injectable()
export class WorkspaceServicesViewPresenter {
  // #region Fields

  private readonly _context = inject(WORKSPACE_SETTINGS_CONTEXT);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT);
  private readonly _registry = inject(ViewSlotRegistry);
  /** The workspace being configured, independent of active execution scope. @public @readonly */
  public readonly workspace = computed(() =>
    this._context.settings()?.workspaces.find((item) => item.id === this._selection.workspaceId()),
  );
  /** The original interleaved order, excluding accounts managed by a repository. @public @readonly */
  public readonly accounts = computed(() => {
    const settings = this._context.settings();
    const workspaceId = this._selection.workspaceId();
    const repositoryAccounts = new Set(
      settings?.repositoryBindings
        .filter((item) => item.workspaceId === workspaceId)
        .map((item) => item.sourceControlConnectionId),
    );
    return (settings?.connections ?? []).filter(
      (account) => account.workspaceId === workspaceId && !repositoryAccounts.has(account.id),
    );
  });
  /** Native registry availability controls only the corresponding host structure. @public @readonly */
  public readonly hasBoards = this._registry.hasViews(SettingsViewSlot.WorkspaceServicesBoards);
  /** Whether configured-account fragments are included in this product. @public @readonly */
  public readonly hasAccounts = this._registry.hasViews(SettingsViewSlot.WorkspaceServicesAccount);
  /** Whether included features offer another account connection. @public @readonly */
  public readonly hasAvailable = this._registry.hasViews(
    SettingsViewSlot.WorkspaceServicesAvailableConnections,
  );

  // #endregion
}
