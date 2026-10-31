// #region Imports

import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import {
  ApplicationRef,
  ChangeDetectorRef,
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { TEAM_CONFIGURATION } from '@symphony/frontend-core/team';
import { WORK_SOURCE_SETTINGS_CONTEXT } from '../ports/WorkSourceSettingsContextToken';
import {
  createTrackedSettingsDraft,
  SettingsAlertService,
  upsertSettingsItem,
  mosaikEventValue,
} from '@symphony/frontend-setting';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import type { IWorkSourceSettingsEditorRequest } from './IWorkSourceSettingsEditorRequest';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import type { AzureDevOpsValidationIssue } from './AzureDevOpsValidationIssue';
import type { BoardColumnMappingChoice } from './BoardColumnMappingChoice';
import type { ApplicationSettingsDto as Settings } from '@symphony/ipc-contracts-composition';

// #endregion

type Connection = Settings['connections'][number];

type GitHubProjectSource = Extract<
  Settings['workItemSources'][number],
  { provider: 'github-projects' }
>;

type GitHubProjectCandidate = ResponsePayload<'github.projects.list'>['projects'][number];

type BoardColumnCandidate = ResponsePayload<'work-item-sources.columns'>['columns'][number];

type WorkItemSourceDraft = Settings['workItemSources'][number];

function upsert<T extends { readonly id: string }>(items: readonly T[], item: T): T[] {
  return upsertSettingsItem(items, item);
}

@Injectable()
export class WorkSourceSettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The store.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(WORK_SOURCE_SETTINGS_CONTEXT);

  /**
   * The data.
   *
   * @public
   * @readonly
   */
  public readonly data = inject<IWorkSourceSettingsEditorRequest>(DIALOG_REF_DATA);

  /**
   * The kind.
   *
   * @public
   * @readonly
   */
  public readonly kind = this.data.kind;
  private readonly _teamConfiguration = inject(TEAM_CONFIGURATION, { optional: true });
  private readonly _alerts = inject(SettingsAlertService);
  private readonly _application = inject(ApplicationRef);
  private readonly _changeDetector = inject(ChangeDetectorRef);

  private readonly _dialogRef = inject(DIALOG_REF);
  private readonly _draftRevision = signal(0);

  /**
   * The busy.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);

  /**
   * The azure.
   *
   * @public
   */
  public azure = this.createAzureDraft();

  /**
   * The github project.
   *
   * @public
   */
  public githubProject = this.createGitHubProjectDraft();

  /**
   * The github projects.
   *
   * @public
   * @readonly
   */
  public readonly githubProjects = signal<readonly GitHubProjectCandidate[]>([]);

  /**
   * The github projects busy.
   *
   * @public
   * @readonly
   */
  public readonly githubProjectsBusy = signal(false);

  /**
   * The github projects error.
   *
   * @public
   * @readonly
   */
  public readonly githubProjectsError = signal<string | undefined>(undefined);

  /**
   * The github project search.
   *
   * @public
   * @readonly
   */
  public readonly githubProjectSearch = signal('');

  /**
   * Provider columns of the board being edited (GitHub Projects or Azure DevOps).
   *
   * @public
   * @readonly
   */
  public readonly boardColumns = signal<readonly BoardColumnCandidate[]>([]);

  /**
   * The board columns busy.
   *
   * @public
   * @readonly
   */
  public readonly boardColumnsBusy = signal(false);

  /**
   * The board columns error.
   *
   * @public
   * @readonly
   */
  public readonly boardColumnsError = signal<string | undefined>(undefined);
  private _boardColumnsRequest = 0;

  /**
   * Stages of the configured workflow, offered as mapping targets for provider columns.
   *
   * @public
   * @readonly
   */
  public readonly stageOptions = computed(() =>
    (this.store.settings()?.workflow.stages ?? []).map((stage) => ({
      id: stage.id,
      label: stage.label,
    })),
  );
  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  private readonly _canSave = this.createDraftProjection(() => this.resolveCanSave());
  private readonly _azureValidationIssues = this.createDraftProjection(() =>
    this.resolveAzureValidationIssues(),
  );

  private readonly _githubConnections = this.createDraftProjection(() =>
    this.resolveGithubConnections(),
  );

  private readonly _githubConnectionLabel = computed(
    () => (connection: Extract<Connection, { kind: 'github' }>) =>
      this.resolveGithubConnectionLabel(connection),
  );

  private readonly _updateGitHubConnectionCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateGitHubConnectionCommand(event),
  );
  private readonly _refreshGitHubProjectsCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshGitHubProjectsCommand(),
  );
  private readonly _filteredGitHubProjects = this.createDraftProjection(() =>
    this.resolveFilteredGitHubProjects(),
  );

  private readonly _searchGitHubProjectsCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteSearchGitHubProjectsCommand(event),
  );
  private readonly _isGitHubProjectSelected = computed(
    () => (project: GitHubProjectCandidate) => this.resolveIsGitHubProjectSelected(project),
  );

  private readonly _selectGitHubProjectCommand: Command<GitHubProjectCandidate> = new Command(
    (project) => void this.onExecuteSelectGitHubProjectCommand(project),
  );
  private readonly _updateGitHubProjectDisplayNameCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateGitHubProjectDisplayNameCommand(event),
  );
  private readonly _updateGitHubProjectOwnerTypeCommand: Command<'organization' | 'user'> =
    new Command((ownerType) => void this.onExecuteUpdateGitHubProjectOwnerTypeCommand(ownerType));
  private readonly _updateGitHubProjectOwnerCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateGitHubProjectOwnerCommand(event),
  );
  private readonly _updateGitHubProjectNumberCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateGitHubProjectNumberCommand(event),
  );
  private readonly _refreshBoardColumnsCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshBoardColumnsCommand(),
  );
  private readonly _canReadBoardColumns = this.createDraftProjection(() =>
    this.resolveCanReadBoardColumns(),
  );

  private readonly _columnMapping = computed(
    () => (columnId: string) => this.resolveColumnMapping(columnId),
  );

  private readonly _updateColumnMappingCommand: Command<
    readonly [columnId: string, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateColumnMappingCommand(...parameters));
  private readonly _unmappedAutomatedStages = this.createDraftProjection(() =>
    this.resolveUnmappedAutomatedStages(),
  );

  private readonly _hasExistingGitHubProject = this.createDraftProjection(() =>
    this.resolveHasExistingGitHubProject(),
  );

  private readonly _removeGitHubProjectCommand: Command<void> = new Command(
    () => void this.onExecuteRemoveGitHubProjectCommand(),
  );

  private readonly _hasExistingAzureDevOpsSource = this.createDraftProjection(() =>
    this.resolveHasExistingAzureDevOpsSource(),
  );

  private readonly _removeAzureDevOpsSourceCommand: Command<void> = new Command(
    () => void this.onExecuteRemoveAzureDevOpsSourceCommand(),
  );

  private readonly _eventText = computed(() => (event: unknown) => this.resolveEventText(event));
  /**
   * The save command.
   *
   * @public
   * @readonly
   */
  public get saveCommand(): Command<void> {
    return this._saveCommand;
  }
  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  /**
   * The required Azure DevOps details that are still empty, in form order; `Save` stays disabled
   * while there is one.
   *
   * @public
   * @readonly
   */
  public get azureValidationIssues() {
    return this._azureValidationIssues;
  }
  /**
   * The canSave projection.
   *
   * @public
   * @readonly
   */
  public get canSave() {
    return this._canSave;
  }
  /**
   * The githubConnections projection.
   *
   * @public
   * @readonly
   */
  public get githubConnections() {
    return this._githubConnections;
  }
  /**
   * The githubConnectionLabel projection.
   *
   * @public
   * @readonly
   */
  public get githubConnectionLabel() {
    return this._githubConnectionLabel;
  }
  /**
   * The updateGitHubConnection command.
   *
   * @public
   * @readonly
   */
  public get updateGitHubConnectionCommand(): Command<unknown> {
    return this._updateGitHubConnectionCommand;
  }
  /**
   * The refreshGitHubProjects command.
   *
   * @public
   * @readonly
   */
  public get refreshGitHubProjectsCommand(): Command<void> {
    return this._refreshGitHubProjectsCommand;
  }
  /**
   * The filteredGitHubProjects projection.
   *
   * @public
   * @readonly
   */
  public get filteredGitHubProjects() {
    return this._filteredGitHubProjects;
  }
  /**
   * The searchGitHubProjects command.
   *
   * @public
   * @readonly
   */
  public get searchGitHubProjectsCommand(): Command<unknown> {
    return this._searchGitHubProjectsCommand;
  }
  /**
   * The isGitHubProjectSelected projection.
   *
   * @public
   * @readonly
   */
  public get isGitHubProjectSelected() {
    return this._isGitHubProjectSelected;
  }
  /**
   * The selectGitHubProject command.
   *
   * @public
   * @readonly
   */
  public get selectGitHubProjectCommand(): Command<GitHubProjectCandidate> {
    return this._selectGitHubProjectCommand;
  }
  /**
   * The updateGitHubProjectDisplayName command.
   *
   * @public
   * @readonly
   */
  public get updateGitHubProjectDisplayNameCommand(): Command<unknown> {
    return this._updateGitHubProjectDisplayNameCommand;
  }
  /**
   * The updateGitHubProjectOwnerType command.
   *
   * @public
   * @readonly
   */
  public get updateGitHubProjectOwnerTypeCommand(): Command<'organization' | 'user'> {
    return this._updateGitHubProjectOwnerTypeCommand;
  }
  /**
   * The updateGitHubProjectOwner command.
   *
   * @public
   * @readonly
   */
  public get updateGitHubProjectOwnerCommand(): Command<unknown> {
    return this._updateGitHubProjectOwnerCommand;
  }
  /**
   * The updateGitHubProjectNumber command.
   *
   * @public
   * @readonly
   */
  public get updateGitHubProjectNumberCommand(): Command<unknown> {
    return this._updateGitHubProjectNumberCommand;
  }
  /**
   * The refreshBoardColumns command.
   *
   * @public
   * @readonly
   */
  public get refreshBoardColumnsCommand(): Command<void> {
    return this._refreshBoardColumnsCommand;
  }
  /**
   * The canReadBoardColumns projection.
   *
   * @public
   * @readonly
   */
  public get canReadBoardColumns() {
    return this._canReadBoardColumns;
  }
  /**
   * The columnMapping projection.
   *
   * @public
   * @readonly
   */
  public get columnMapping() {
    return this._columnMapping;
  }
  /**
   * The updateColumnMapping command.
   *
   * @public
   * @readonly
   */
  public get updateColumnMappingCommand(): Command<readonly [columnId: string, event: unknown]> {
    return this._updateColumnMappingCommand;
  }
  /**
   * The unmappedAutomatedStages projection.
   *
   * @public
   * @readonly
   */
  public get unmappedAutomatedStages() {
    return this._unmappedAutomatedStages;
  }
  /**
   * The hasExistingGitHubProject projection.
   *
   * @public
   * @readonly
   */
  public get hasExistingGitHubProject() {
    return this._hasExistingGitHubProject;
  }
  /**
   * The removeGitHubProject command.
   *
   * @public
   * @readonly
   */
  public get removeGitHubProjectCommand(): Command<void> {
    return this._removeGitHubProjectCommand;
  }
  /**
   * Whether the sheet edits a saved Azure DevOps source, which can be removed.
   *
   * @public
   * @readonly
   */
  public get hasExistingAzureDevOpsSource() {
    return this._hasExistingAzureDevOpsSource;
  }
  /**
   * Removes the Azure DevOps source after a destructive confirmation.
   *
   * @public
   * @readonly
   */
  public get removeAzureDevOpsSourceCommand(): Command<void> {
    return this._removeAzureDevOpsSourceCommand;
  }
  /**
   * The eventText projection.
   *
   * @public
   * @readonly
   */
  public get eventText() {
    return this._eventText;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  /** Hydrates this feature-owned sheet from the authoritative configuration. @public */
  public override async onHydrate(): Promise<void> {
    try {
      if (!this.store.settings()) await this.hydrateConfiguration();
      if (this.data.kind === 'github-projects') {
        this.githubProject = this.createGitHubProjectDraft();
        void this.onExecuteRefreshGitHubProjectsCommand().finally(() =>
          this._changeDetector.detectChanges(),
        );
        if (this.githubProject.projectNumber) {
          void this.onExecuteRefreshBoardColumnsCommand().finally(() =>
            this._changeDetector.detectChanges(),
          );
        }
      }
      if (this.data.kind === 'azure-devops' && this.data.sourceId) {
        this.azure = this.createAzureDraft();
        void this.store
          .refreshProviderConnections()
          .finally(() => this._changeDetector.detectChanges());
        void this.onExecuteRefreshBoardColumnsCommand().finally(() =>
          this._changeDetector.detectChanges(),
        );
      }
    } finally {
      window.requestAnimationFrame(() => this._application.tick());
    }
  }

  /**
   * Saves.
   *
   * @private
   */
  private async onExecuteSaveCommand(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (this.data.kind === 'azure-devops') await this.saveAzureDevOps();
      if (this.data.kind === 'github-projects') await this.saveGitHubProject();
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._dialogRef.close();
  }

  /**
   * Whether it can save.
   *
   * @private
   */
  private resolveCanSave(): boolean {
    if (this.kind === 'github-projects') return this.canSaveGitHubProject();
    return this.resolveAzureValidationIssues().length === 0;
  }

  /**
   * Returns the required Azure DevOps details that are still empty.
   *
   * @private
   */
  private resolveAzureValidationIssues(): readonly AzureDevOpsValidationIssue[] {
    if (this.kind !== 'azure-devops') return [];
    return [
      ...(!this.azure.displayName.trim() ? (['display-name'] as const) : []),
      ...(!this.azure.organization.trim() ? (['organization'] as const) : []),
      ...(!this.azure.project.trim() ? (['project'] as const) : []),
      ...(!this.azure.queryId.trim() && !this.azure.wiql.trim() ? (['query'] as const) : []),
    ];
  }

  /**
   * Authentication state of the Azure DevOps connection edited by this drawer.
   *
   * @public
   * @readonly
   */
  public readonly azureDevOpsAuthenticated = (): boolean => {
    const connectionId = this.azure.connectionId;
    if (!connectionId) return false;
    return (
      this.store.connections()?.azureDevOps.accounts.find((account) => account.id === connectionId)
        ?.authenticated === true
    );
  };

  /**
   * Human-readable authentication state without exposing a credential reference.
   *
   * @public
   * @readonly
   */
  public readonly azureDevOpsAuthenticationLabel = (): string => {
    const account = this.store
      .connections()
      ?.azureDevOps.accounts.find((candidate) => candidate.id === this.azure.connectionId);
    if (!account?.authenticated) return 'Not connected';
    if (account.method === 'environment') return 'Connected · environment credential';
    if (account.method === 'entra') return 'Connected · temporary Microsoft Entra token';
    return 'Connected · PAT in secure storage';
  };

  /**
   * Whether the current Azure DevOps draft and PAT can be verified.
   *
   * @public
   * @readonly
   */
  public readonly canConnectAzureDevOps = (): boolean => this.canConnectAzureDevOpsDraft();

  /**
   * Saves the source, verifies the PAT, and moves it into operating-system secure storage.
   *
   * @public
   * @readonly
   */
  public readonly connectAzureDevOps = async (): Promise<void> => {
    if (!this.canConnectAzureDevOpsDraft() || this.busy() || this.store.configurationBusy()) return;
    this.busy.set(true);
    try {
      const connectionId = await this.saveAzureDevOps(false);
      if (!connectionId) return;
      if (await this.store.connectAzureDevOps(connectionId, this.azure.pat.trim())) {
        this.azure.pat = '';
        this.azure = { ...this.createAzureDraft(), pat: '' };
        await this.store.refresh(true);
      }
    } finally {
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  };

  /**
   * Removes the credential while leaving the source configuration intact.
   *
   * @public
   * @readonly
   */
  public readonly disconnectAzureDevOps = async (): Promise<void> => {
    const connectionId = this.azure.connectionId;
    if (!connectionId || this.busy() || this.store.configurationBusy()) return;
    this.busy.set(true);
    try {
      if (await this.store.disconnectAzureDevOps(connectionId)) {
        this.azure.credentialRef = '';
        await this.store.refresh(true);
      }
    } finally {
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  };

  private canConnectAzureDevOpsDraft(): boolean {
    return (
      Boolean(this.azure.pat.trim()) &&
      Boolean(this.azure.displayName.trim()) &&
      Boolean(this.azure.organization.trim()) &&
      Boolean(this.azure.project.trim()) &&
      Boolean(this.azure.queryId.trim() || this.azure.wiql.trim())
    );
  }

  // GitHub Projects board editor

  /**
   * GitHub connections of the workspace; the board reads the project through one of them.
   *
   * @private
   */
  private resolveGithubConnections(): readonly Extract<Connection, { kind: 'github' }>[] {
    const data = this.data;
    if (data.kind !== 'github-projects') return [];
    return (this.store.settings()?.connections ?? []).filter(
      (connection): connection is Extract<Connection, { kind: 'github' }> =>
        connection.kind === 'github' && connection.workspaceId === data.workspaceId,
    );
  }

  /**
   * Returns the github connection label.
   *
   * @param connection - Connection.
   * @private
   */
  private resolveGithubConnectionLabel(
    connection: Extract<Connection, { kind: 'github' }>,
  ): string {
    return `${connection.displayName} · ${connection.hostname}${connection.accountLogin ? ` · @${connection.accountLogin}` : ''}`;
  }

  /**
   * Updates the git hub connection.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateGitHubConnectionCommand(event: unknown): void {
    const connectionId = this.resolveEventText(event);
    if (
      connectionId === this.githubProject.connectionId ||
      !this.resolveGithubConnections().some((connection) => connection.id === connectionId)
    ) {
      return;
    }
    this.githubProject.connectionId = connectionId;
    this.githubProjects.set([]);
    void this.onExecuteRefreshGitHubProjectsCommand().finally(() =>
      this._changeDetector.detectChanges(),
    );
    this._changeDetector.detectChanges();
  }

  /**
   * Refreshes the git hub projects.
   *
   * @private
   */
  private async onExecuteRefreshGitHubProjectsCommand(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'github-projects' || !this.githubProject.connectionId) return;
    this.githubProjectsBusy.set(true);
    this.githubProjectsError.set(undefined);
    try {
      const result = await this.store.listGitHubProjects({
        workspaceId: data.workspaceId,
        connectionId: this.githubProject.connectionId,
      });
      this.githubProjects.set(result.projects);
      this.githubProjectsError.set(result.error);
    } finally {
      this.githubProjectsBusy.set(false);
    }
  }

  /**
   * Returns the filtered git hub projects.
   *
   * @private
   */
  private resolveFilteredGitHubProjects(): readonly GitHubProjectCandidate[] {
    const query = this.githubProjectSearch().trim().toLocaleLowerCase();
    return this.githubProjects().filter(
      (project) =>
        !query ||
        `${project.title} ${project.owner} #${project.projectNumber} ${project.url}`
          .toLocaleLowerCase()
          .includes(query),
    );
  }

  /**
   * Returns the search git hub projects.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteSearchGitHubProjectsCommand(event: unknown): void {
    this.githubProjectSearch.set(this.resolveEventText(event));
  }

  /**
   * Whether it is git hub project selected.
   *
   * @param project - Project.
   * @private
   */
  private resolveIsGitHubProjectSelected(project: GitHubProjectCandidate): boolean {
    return (
      this.githubProject.ownerType === project.ownerType &&
      this.githubProject.owner.toLocaleLowerCase() === project.owner.toLocaleLowerCase() &&
      this.githubProject.projectNumber === project.projectNumber
    );
  }

  /**
   * Selects the git hub project.
   *
   * @param project - Project.
   * @private
   */
  private onExecuteSelectGitHubProjectCommand(project: GitHubProjectCandidate): void {
    if (this.resolveIsGitHubProjectSelected(project)) return;
    this.githubProject.ownerType = project.ownerType;
    this.githubProject.owner = project.owner;
    this.githubProject.projectNumber = project.projectNumber;
    if (!this.githubProject.displayNameEdited || !this.githubProject.displayName.trim()) {
      this.githubProject.displayName = project.title;
    }
    this.githubProject.columnMappings = {};
    this.boardColumns.set([]);
    void this.onExecuteRefreshBoardColumnsCommand().finally(() =>
      this._changeDetector.detectChanges(),
    );
    this._changeDetector.detectChanges();
  }

  /**
   * Updates the git hub project display name.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateGitHubProjectDisplayNameCommand(event: unknown): void {
    this.githubProject.displayName = this.resolveEventText(event);
    this.githubProject.displayNameEdited = true;
  }

  /**
   * Updates the git hub project owner type.
   *
   * @param ownerType - Owner type.
   * @private
   */
  private onExecuteUpdateGitHubProjectOwnerTypeCommand(ownerType: 'organization' | 'user'): void {
    if (this.githubProject.ownerType === ownerType) return;
    this.githubProject.ownerType = ownerType;
    this._changeDetector.detectChanges();
  }

  /**
   * Updates the git hub project owner.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateGitHubProjectOwnerCommand(event: unknown): void {
    this.githubProject.owner = this.resolveEventText(event);
  }

  /**
   * Updates the git hub project number.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateGitHubProjectNumberCommand(event: unknown): void {
    const value = Number(this.resolveEventText(event));
    this.githubProject.projectNumber = Number.isInteger(value) && value > 0 ? value : 0;
  }

  /**
   * Reads the provider columns for the edited board and pre-fills mappings from saved values or suggestions.
   *
   * @private
   */
  private async onExecuteRefreshBoardColumnsCommand(): Promise<void> {
    const source = this.boardColumnSourceDraft();
    if (!source) return;
    const request = ++this._boardColumnsRequest;
    this.boardColumnsBusy.set(true);
    this.boardColumnsError.set(undefined);
    try {
      const result = await this.store.listWorkItemSourceColumns({ source });
      // A newer read (other project, other connection) owns the editor state now.
      if (request !== this._boardColumnsRequest) return;
      if (result.error) {
        // Keep the saved mappings: a failed read must not turn into an unmapped board on save.
        this.boardColumns.set([]);
        this.boardColumnsError.set(result.error);
        return;
      }
      this.boardColumns.set(result.columns);
      this.boardColumnsError.set(undefined);
      const draft = this.mappingsDraft();
      const mappings: Record<string, BoardColumnMappingChoice> = {};
      for (const column of result.columns) {
        mappings[column.id] = draft.columnMappings[column.id] ?? column.suggestedStageId ?? '';
      }
      draft.columnMappings = mappings;
    } finally {
      if (request === this._boardColumnsRequest) this.boardColumnsBusy.set(false);
    }
  }

  /**
   * Whether it can read board columns.
   *
   * @private
   */
  private resolveCanReadBoardColumns(): boolean {
    return Boolean(this.boardColumnSourceDraft());
  }

  /**
   * Returns the column mapping.
   *
   * @param columnId - Column id.
   * @private
   */
  private resolveColumnMapping(columnId: string): BoardColumnMappingChoice {
    return this.mappingsDraft().columnMappings[columnId] ?? '';
  }

  /**
   * Updates the column mapping.
   *
   * @param columnId - Column id.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateColumnMappingCommand(columnId: string, event: unknown): void {
    const value = this.resolveEventText(event);
    const stageId = this.stageOptions().some((option: { id: string }) => option.id === value)
      ? value
      : '';
    const draft = this.mappingsDraft();
    draft.columnMappings = { ...draft.columnMappings, [columnId]: stageId };
    this._changeDetector.detectChanges();
  }

  /**
   * Automated stages that no column maps to. Automation cannot pick work up for a stage that
   * has no column, so these are reported before the board is saved.
   *
   * @private
   */
  private resolveUnmappedAutomatedStages(): readonly string[] {
    const mapped = new Set(Object.values(this.mappingsDraft().columnMappings));
    return (this.store.settings()?.workflow.stages ?? [])
      .filter((stage) => stage.kind === 'automated' && !mapped.has(stage.id))
      .map((stage) => stage.label);
  }

  /**
   * Whether it can save git hub project.
   *
   * @private
   */
  private canSaveGitHubProject(): boolean {
    return Boolean(
      this.githubProject.displayName.trim() &&
      this.githubProject.connectionId &&
      this.githubProject.owner.trim() &&
      this.githubProject.projectNumber > 0,
    );
  }

  /**
   * Whether it has existing git hub project.
   *
   * @private
   */
  private resolveHasExistingGitHubProject(): boolean {
    return this.data.kind === 'github-projects' && Boolean(this.data.sourceId);
  }

  /**
   * Removes the git hub project.
   *
   * @private
   */
  private async onExecuteRemoveGitHubProjectCommand(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'github-projects' || !data.sourceId) return;
    const source = this.store.settings()?.workItemSources.find((item) => item.id === data.sourceId);
    const confirmed = await this._alerts.confirm({
      id: `remove-board-${data.sourceId}`,
      header: `Remove ${source?.displayName || 'this board'}?`,
      message:
        'Symphony stops reading this GitHub Project. Its work items stay in GitHub, but they no longer appear on the Board, the Overview or the Orbit.',
      tone: 'danger',
      confirmLabel: 'Remove board',
      cancelLabel: 'Keep board',
      destructive: true,
    });
    if (!confirmed) return;
    const current = this.requireSettings();
    const next = this.synchronizeDeliveryContext(
      this.withoutWorkItemSource(current, data.sourceId),
      data.workspaceId,
    );
    if (await this.store.saveSettings(next)) {
      this._dialogRef.close();
      await this.store.refresh();
    }
  }

  /**
   * Whether the sheet edits a saved Azure DevOps source.
   *
   * @private
   */
  private resolveHasExistingAzureDevOpsSource(): boolean {
    const data = this.data;
    return (
      data.kind === 'azure-devops' &&
      Boolean(
        this.store
          .settings()
          ?.workItemSources.some(
            (source) => source.id === data.sourceId && source.provider === 'azure-devops',
          ),
      )
    );
  }

  /**
   * Removes the Azure DevOps source after a destructive confirmation. Its account goes with it
   * when no other source uses the account, and the stored personal access token is deleted from
   * the operating-system keychain first.
   *
   * @private
   */
  private async onExecuteRemoveAzureDevOpsSourceCommand(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'azure-devops' || !data.sourceId || this.busy()) return;
    const source = this.store
      .settings()
      ?.workItemSources.find(
        (item) => item.id === data.sourceId && item.provider === 'azure-devops',
      );
    if (!source) return;
    const confirmed = await this._alerts.confirm({
      id: `remove-azure-devops-source-${source.id}`,
      header: `Remove ${source.displayName}?`,
      message:
        'Symphony stops reading this Azure DevOps query and deletes the stored personal access token. Its work items stay in Azure DevOps, but they no longer appear on the Board, the Overview or the Orbit.',
      tone: 'danger',
      confirmLabel: 'Remove source',
      cancelLabel: 'Keep source',
      destructive: true,
    });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      const before = this.requireSettings();
      const connection = before.connections.find(
        (item) => item.id === source.connectionId && item.kind === 'azure-devops',
      );
      const sharedConnection = before.workItemSources.some(
        (item) => item.id !== source.id && item.connectionId === source.connectionId,
      );
      if (
        connection?.kind === 'azure-devops' &&
        connection.credentialRef &&
        !sharedConnection &&
        !(await this.store.disconnectAzureDevOps(connection.id))
      )
        return;
      const current = this.requireSettings();
      const withoutSource = this.withoutWorkItemSource(current, source.id);
      const next = this.synchronizeDeliveryContext(
        sharedConnection
          ? withoutSource
          : {
              ...withoutSource,
              connections: withoutSource.connections.filter(
                (item) => item.id !== source.connectionId,
              ),
            },
        data.workspaceId,
      );
      if (await this.store.saveSettings(next)) {
        this._dialogRef.close();
        await this.store.refresh();
      }
    } finally {
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  }

  /**
   * Removes one work-item source and clears it as the selected board.
   *
   * @param settings - Current settings.
   * @param sourceId - Removed source.
   * @private
   */
  private withoutWorkItemSource(settings: Settings, sourceId: string): Settings {
    return {
      ...settings,
      workItemSources: settings.workItemSources.filter((source) => source.id !== sourceId),
      activeViewScope: {
        ...settings.activeViewScope,
        workItemSourceId:
          settings.activeViewScope.workItemSourceId === sourceId
            ? undefined
            : settings.activeViewScope.workItemSourceId,
      },
    };
  }

  /**
   * Returns the event text.
   *
   * @param event - Event.
   * @private
   */
  private resolveEventText(event: unknown): string {
    return String(mosaikEventValue(event) ?? '');
  }

  /** Draft of the source being edited, as the provider needs it to read columns. */
  private boardColumnSourceDraft(): WorkItemSourceDraft | undefined {
    const data = this.data;
    if (data.kind === 'github-projects') {
      if (
        !this.githubProject.connectionId ||
        !this.githubProject.owner.trim() ||
        !this.githubProject.projectNumber
      ) {
        return undefined;
      }
      return {
        id: data.sourceId ?? 'draft-board',
        workspaceId: data.workspaceId,
        connectionId: this.githubProject.connectionId,
        provider: 'github-projects',
        displayName: this.githubProject.displayName.trim() || 'Draft board',
        ownerType: this.githubProject.ownerType,
        owner: this.githubProject.owner.trim(),
        projectNumber: this.githubProject.projectNumber,
        enabled: true,
      };
    }
    if (data.kind === 'azure-devops') {
      const existing = this.store
        .settings()
        ?.workItemSources.find(
          (source) => source.id === data.sourceId && source.provider === 'azure-devops',
        );
      if (!existing || existing.provider !== 'azure-devops') return undefined;
      return {
        ...existing,
        project: this.azure.project.trim() || existing.project,
        ...(this.azure.team.trim() ? { team: this.azure.team.trim() } : {}),
        ...(this.azure.boardId.trim() ? { boardId: this.azure.boardId.trim() } : {}),
      };
    }
    return undefined;
  }

  private mappingsDraft(): { columnMappings: Record<string, BoardColumnMappingChoice> } {
    return this.data.kind === 'azure-devops' ? this.azure : this.githubProject;
  }

  /** Saved-shape mappings for the edited board; only mapped columns are written. */
  private savedColumnMappings() {
    return Object.entries(this.mappingsDraft().columnMappings).flatMap(([columnId, stageId]) =>
      stageId ? [{ columnId, stageId }] : [],
    );
  }

  private async saveGitHubProject(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'github-projects' || !this.canSaveGitHubProject()) return;
    const current = this.requireSettings();
    const existing = current.workItemSources.find(
      (item): item is GitHubProjectSource =>
        item.id === data.sourceId && item.provider === 'github-projects',
    );
    const columnMappings = this.savedColumnMappings();
    const source: GitHubProjectSource = {
      id: existing?.id ?? `board-${crypto.randomUUID()}`,
      workspaceId: data.workspaceId,
      connectionId: this.githubProject.connectionId,
      provider: 'github-projects',
      displayName: this.githubProject.displayName.trim(),
      ownerType: this.githubProject.ownerType,
      owner: this.githubProject.owner.trim(),
      projectNumber: this.githubProject.projectNumber,
      ...(columnMappings.length ? { columnMappings } : {}),
      enabled: this.githubProject.enabled,
    };
    const next = this.synchronizeDeliveryContext(
      { ...current, workItemSources: upsert(current.workItemSources, source) },
      data.workspaceId,
    );
    if (await this.store.saveSettings(next)) {
      this._dialogRef.close();
      await this.store.refresh();
    }
  }

  private async hydrateConfiguration(): Promise<void> {
    await this.store.refreshConfiguration();
    this.azure = this.createAzureDraft();
  }

  private async saveAzureDevOps(close = true): Promise<string | undefined> {
    const data = this.data;
    if (data.kind !== 'azure-devops') return undefined;
    const current = this.requireSettings();
    if (
      !this.azure.displayName.trim() ||
      !this.azure.organization.trim() ||
      !this.azure.project.trim()
    )
      return undefined;
    if (!this.azure.queryId.trim() && !this.azure.wiql.trim()) return undefined;
    const existingSource = current.workItemSources.find((item) => item.id === data.sourceId);
    const sourceId = existingSource?.id ?? `work-source-${crypto.randomUUID()}`;
    const connectionId =
      this.azure.connectionId || existingSource?.connectionId || `ado-${crypto.randomUUID()}`;
    const connection: Extract<Connection, { kind: 'azure-devops' }> = {
      id: connectionId,
      workspaceId: data.workspaceId,
      kind: 'azure-devops',
      displayName: this.azure.displayName.trim(),
      organization: this.azure.organization.trim(),
      ...(this.azure.tenantId.trim() ? { tenantId: this.azure.tenantId.trim() } : {}),
      ...(this.azure.credentialRef.trim()
        ? { credentialRef: this.azure.credentialRef.trim() }
        : {}),
    };
    const source: Extract<Settings['workItemSources'][number], { provider: 'azure-devops' }> = {
      id: sourceId,
      workspaceId: data.workspaceId,
      connectionId,
      provider: 'azure-devops',
      displayName: this.azure.displayName.trim(),
      project: this.azure.project.trim(),
      ...(this.azure.team.trim() ? { team: this.azure.team.trim() } : {}),
      ...(this.azure.queryId.trim()
        ? { queryId: this.azure.queryId.trim() }
        : this.azure.wiql.trim()
          ? { wiql: this.azure.wiql.trim() }
          : {}),
      ...(this.azure.boardId.trim() ? { boardId: this.azure.boardId.trim() } : {}),
      ...(this.savedColumnMappings().length ? { columnMappings: this.savedColumnMappings() } : {}),
      enabled: this.azure.enabled,
    };
    const next = this.synchronizeDeliveryContext(
      {
        ...current,
        connections: upsert(current.connections, connection),
        workItemSources: upsert(current.workItemSources, source),
      },
      data.workspaceId,
    );
    if (!(await this.store.saveSettings(next))) return undefined;
    this.azure.connectionId = connectionId;
    if (close) this._dialogRef.close();
    return connectionId;
  }
  private synchronizeDeliveryContext(settings: Settings, workspaceId: string): Settings {
    return this._teamConfiguration?.synchronizeDeliveryContext(settings, workspaceId) ?? settings;
  }

  /**
   * Creates a computed projection that also follows mutable sheet draft changes.
   *
   * @param resolve - Resolves the current projection value.
   * @private
   */
  private createDraftProjection<TResult>(resolve: () => TResult) {
    return computed(() => {
      this._draftRevision();
      return resolve();
    });
  }

  /**
   * Tracks assignments to a mutable sheet draft as a reactive revision.
   *
   * @param draft - Draft to track.
   * @private
   */
  private createTrackedDraft<TDraft extends object>(draft: TDraft): TDraft {
    return createTrackedSettingsDraft(draft, () =>
      this._draftRevision.update((revision) => revision + 1),
    );
  }

  private createGitHubProjectDraft() {
    const settings = this.store.settings();
    const data = this.data;
    const source =
      data.kind === 'github-projects'
        ? settings?.workItemSources.find(
            (item): item is GitHubProjectSource =>
              item.id === data.sourceId && item.provider === 'github-projects',
          )
        : undefined;
    const connections =
      data.kind === 'github-projects'
        ? (settings?.connections ?? []).filter(
            (connection) =>
              connection.kind === 'github' && connection.workspaceId === data.workspaceId,
          )
        : [];
    return this.createTrackedDraft({
      displayName: source?.displayName ?? '',
      displayNameEdited: Boolean(source),
      connectionId: source?.connectionId ?? connections[0]?.id ?? '',
      ownerType: source?.ownerType ?? ('user' as 'organization' | 'user'),
      owner: source?.owner ?? '',
      projectNumber: source?.projectNumber ?? 0,
      columnMappings: Object.fromEntries(
        (source?.columnMappings ?? []).map((mapping) => [mapping.columnId, mapping.stageId]),
      ) as Record<string, BoardColumnMappingChoice>,
      enabled: source?.enabled ?? true,
    });
  }

  private createAzureDraft() {
    const settings = this.store.settings();
    const data = this.data;
    const source =
      data.kind === 'azure-devops'
        ? settings?.workItemSources.find(
            (item) => item.id === data.sourceId && item.provider === 'azure-devops',
          )
        : undefined;
    const connection = source
      ? settings?.connections.find(
          (item) => item.id === source.connectionId && item.kind === 'azure-devops',
        )
      : undefined;
    return this.createTrackedDraft({
      connectionId: connection?.id ?? '',
      displayName: source?.displayName ?? '',
      organization: connection?.kind === 'azure-devops' ? connection.organization : '',
      tenantId: connection?.kind === 'azure-devops' ? (connection.tenantId ?? '') : '',
      credentialRef: connection?.kind === 'azure-devops' ? (connection.credentialRef ?? '') : '',
      pat: '',
      project: source?.provider === 'azure-devops' ? source.project : '',
      team: source?.provider === 'azure-devops' ? (source.team ?? '') : '',
      queryId: source?.provider === 'azure-devops' ? (source.queryId ?? '') : '',
      wiql:
        source?.provider === 'azure-devops'
          ? (source.wiql ?? '')
          : 'SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.ChangedDate] DESC',
      boardId: source?.provider === 'azure-devops' ? (source.boardId ?? '') : '',
      columnMappings: Object.fromEntries(
        (source?.provider === 'azure-devops' ? (source.columnMappings ?? []) : []).map(
          (mapping) => [mapping.columnId, mapping.stageId],
        ),
      ) as Record<string, BoardColumnMappingChoice>,
      enabled: source?.enabled ?? true,
    });
  }

  private requireSettings(): Settings {
    const settings = this.store.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }

  // #endregion
}
