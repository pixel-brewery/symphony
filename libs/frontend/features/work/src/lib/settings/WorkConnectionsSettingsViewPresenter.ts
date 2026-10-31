// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { VIEW_SLOT_CONTEXT, type IViewSlotContext } from '@pixel-brewery/mosaik-elements-angular';
import { Command } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import {
  SettingsEditorRegistry,
  SettingsEditorService,
  SettingsHostSession,
  type ISettingsEditorRequest,
  type ISettingsServiceSelection,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { workSourceOrigin } from './workSourceOrigin';
// #endregion
type ProviderConnection = ApplicationSettingsDto['connections'][number];
/** Owns Work source rows and delegates their actual editors through the native Settings registry. @public */
@Injectable()
export class WorkConnectionsSettingsViewPresenter {
  // #region Fields
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _settingsEditors = inject(SettingsEditorService);
  private readonly _settingsHost = inject(SettingsHostSession);
  private readonly _registry = inject(SettingsEditorRegistry);
  private readonly _selection =
    inject<IViewSlotContext<ISettingsServiceSelection>>(VIEW_SLOT_CONTEXT);
  /** Workspace selected by the native Services outlet. @public @readonly */
  public readonly workspace = computed(() =>
    this._configuration
      .settings()
      ?.workspaces.find((item) => item.id === this._selection.selection()?.workspaceId),
  );
  /** Exactly one source-control or work-item account selected by the Services host. @public @readonly */
  public readonly account = computed(() => {
    const selection = this._selection.selection();
    const account = this._configuration
      .settings()
      ?.connections.find(
        (item) =>
          item.id === selection?.connectionId && item.workspaceId === selection?.workspaceId,
      );
    return account?.kind === 'github' || account?.kind === 'azure-devops' ? account : undefined;
  });
  /** Keeps the original account row while disabling an editor whose owning feature is omitted. @public @readonly */
  public readonly canEditAccount = computed(
    () => this.account()?.kind !== 'github' || this._registry.has('repository'),
  );
  /** Opens the existing account-specific editor without changing its underlying section. @public @readonly */
  public readonly openAccountCommand = new Command<ProviderConnection>((account) => {
    const settings = this._configuration.settings();
    if (!settings) return;
    if (account.kind === 'azure-devops') {
      const source = settings.workItemSources.find(
        (item) => item.provider === 'azure-devops' && item.connectionId === account.id,
      );
      this.onExecuteOpenAzureCommand(account.workspaceId, source?.id);
    } else if (account.kind === 'github' && this._registry.has('repository')) {
      const repository = settings.repositoryBindings.find(
        (item) => item.sourceControlConnectionId === account.id,
      );
      this.openEditor({
        kind: 'repository',
        workspaceId: account.workspaceId,
        repositoryBindingId: repository?.id,
      });
    }
  });

  private readonly _openAzureCommand: Command<readonly [workspaceId: string, sourceId?: string]> =
    new Command((parameters) => void this.onExecuteOpenAzureCommand(...parameters));

  private readonly _openGitHubProjectsCommand: Command<
    readonly [workspaceId: string, sourceId?: string]
  > = new Command((parameters) => void this.onExecuteOpenGitHubProjectsCommand(...parameters));

  private readonly _workspaceBoards = computed(
    () => (workspaceId: string) => this.resolveWorkspaceBoards(workspaceId),
  );

  private readonly _boardSummary = computed(
    () => (source: ApplicationSettingsDto['workItemSources'][number]) =>
      this.resolveBoardSummary(source),
  );

  private readonly _openBoardCommand: Command<ApplicationSettingsDto['workItemSources'][number]> =
    new Command((source) => void this.onExecuteOpenBoardCommand(source));
  // #endregion
  // #region Properties

  /**
   * The openAzure command.
   *
   * @public
   * @readonly
   */
  public get openAzureCommand(): Command<readonly [workspaceId: string, sourceId?: string]> {
    return this._openAzureCommand;
  }

  /**
   * The openGitHubProjects command.
   *
   * @public
   * @readonly
   */
  public get openGitHubProjectsCommand(): Command<
    readonly [workspaceId: string, sourceId?: string]
  > {
    return this._openGitHubProjectsCommand;
  }

  /**
   * The workspaceBoards projection.
   *
   * @public
   * @readonly
   */
  public get workspaceBoards() {
    return this._workspaceBoards;
  }

  /**
   * The boardSummary projection.
   *
   * @public
   * @readonly
   */
  public get boardSummary() {
    return this._boardSummary;
  }

  /**
   * The openBoard command.
   *
   * @public
   * @readonly
   */
  public get openBoardCommand(): Command<ApplicationSettingsDto['workItemSources'][number]> {
    return this._openBoardCommand;
  }
  // #endregion
  // #region Methods

  /**
   * Opens the azure.
   *
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @private
   */
  private onExecuteOpenAzureCommand(workspaceId: string, sourceId?: string): void {
    this.openEditor({ kind: 'azure-devops', workspaceId, sourceId });
  }

  /**
   * Opens the git hub projects.
   *
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @private
   */
  private onExecuteOpenGitHubProjectsCommand(workspaceId: string, sourceId?: string): void {
    this.openEditor({ kind: 'github-projects', workspaceId, sourceId });
  }

  /**
   * Boards (work-item sources) of one workspace, GitHub Projects and Azure DevOps alike.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveWorkspaceBoards(workspaceId: string) {
    return (this._configuration.settings()?.workItemSources ?? []).filter(
      (source) => source.workspaceId === workspaceId && source.provider !== 'simulated',
    );
  }

  /**
   * Returns the board summary.
   *
   * @param source - Source.
   * @private
   */
  private resolveBoardSummary(source: ApplicationSettingsDto['workItemSources'][number]): string {
    return `${workSourceOrigin(source)} · ${source.enabled ? 'Enabled' : 'Disabled'}`;
  }

  /**
   * Opens the board.
   *
   * @param source - Source.
   * @private
   */
  private onExecuteOpenBoardCommand(
    source: ApplicationSettingsDto['workItemSources'][number],
  ): void {
    if (source.provider === 'github-projects')
      this.onExecuteOpenGitHubProjectsCommand(source.workspaceId, source.id);
    else if (source.provider === 'azure-devops')
      this.onExecuteOpenAzureCommand(source.workspaceId, source.id);
  }

  private openEditor<TRequest extends ISettingsEditorRequest>(data: TRequest): void {
    void this._settingsEditors.open(data, (workspaceId, section) => {
      if (workspaceId) this._settingsHost.openWorkspace(workspaceId, section);
      else this._settingsHost.selectWorkspaceSection(section);
    });
  }
  // #endregion
}
