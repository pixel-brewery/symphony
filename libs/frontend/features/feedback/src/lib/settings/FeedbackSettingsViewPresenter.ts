// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import { SETTINGS_WORKSPACE_CONTEXT, SettingsEditorService } from '@symphony/frontend-setting';
import { FEEDBACK_SETTINGS_CONTEXT } from '../ports/FeedbackSettingsContextToken';
import type { IFeedbackSettingsEditorRequest } from './IFeedbackSettingsEditorRequest';

// #endregion

/** Projects the selected workspace's intake section without changing application scope. @public */
@Injectable()
export class FeedbackSettingsViewPresenter {
  // #region Fields

  private readonly _context = inject(FEEDBACK_SETTINGS_CONTEXT);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT);
  private readonly _editors = inject(SettingsEditorService);
  /** Workspace currently being configured. @public @readonly */
  public readonly workspace = computed(() =>
    this._context
      .settings()
      ?.workspaces.find((workspace) => workspace.id === this._selection.workspaceId()),
  );
  /** Existing source order is preserved. @public @readonly */
  public readonly sources = computed(() =>
    (this._context.settings()?.feedbackIntakeSources ?? []).filter(
      (source) => source.workspaceId === this._selection.workspaceId(),
    ),
  );
  /** Repository lookup uses the current authoritative configuration. @public @readonly */
  public readonly repository = computed(
    () => (id: string) =>
      this._context.settings()?.repositoryBindings.find((repository) => repository.id === id),
  );
  /** Opens the one registered channel editor. @public @readonly */
  public readonly openTeamsFeedbackCommand = new Command<[workspaceId: string, sourceId?: string]>(
    ([workspaceId, sourceId]) => {
      const request: IFeedbackSettingsEditorRequest = {
        kind: 'teams-feedback',
        workspaceId,
        sourceId,
      };
      void this._editors.open(request);
    },
  );

  // #endregion
}
