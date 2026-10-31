// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import type { IApplicationSettings, ProviderConnection } from '@symphony/configuration-composition';
import type { ICiWorkflow } from '@symphony/domain-ci';
import type { IGitHubProjectCandidate } from '@symphony/domain-work';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IDeliveryTarget } from '@symphony/domain-delivery';
import { resolveWorkItemActions } from '@symphony/domain-execution';
import { applicationSettingsSchema } from '@symphony/configuration-composition';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { createSetupTeam } from '@symphony/frontend-feature-team';
import { WORK_ONBOARDING_CONTEXT } from '../ports/WorkOnboardingContextToken';
import { WORK_ONBOARDING_CLIENT } from '../ports/WorkOnboardingClientToken';
import type { ISetupSheetRequest } from '../models/ISetupSheetRequest';

// #endregion

/** Keeps configuration proposals local until Apply and starts an actual read-only analysis. */
@Injectable()
export class SetupViewPresenter extends ViewPresenter {
  // #region Fields
  /**
   * The store projection or command.
   *
   * @public
   */
  public readonly store = inject(WORK_ONBOARDING_CONTEXT);
  private readonly _client = inject(WORK_ONBOARDING_CLIENT);
  private readonly _notifications = inject(NotificationService);
  private readonly _router = inject(Router);
  private readonly _desktop = inject(DESKTOP_CLIENT, { optional: true });
  private readonly _sheet = inject(DIALOG_REF, { optional: true });
  private readonly _request = inject<ISetupSheetRequest | null>(DIALOG_REF_DATA, {
    optional: true,
  });
  private readonly _id = crypto.randomUUID();
  /**
   * The local configuration proposal before explicit application.
   *
   * @public
   */
  public readonly base = signal<IApplicationSettings | undefined>(undefined);
  /**
   * Workspace selected for the onboarding proposal.
   *
   * @public
   */
  public readonly workspaceId = signal('');
  /**
   * Repository selected for the onboarding proposal.
   *
   * @public
   */
  public readonly repositoryId = signal('');
  /**
   * Owner and repository name for a proposed GitHub binding.
   *
   * @public
   */
  public readonly repositoryName = signal('');
  /**
   * The discovered or proposed default branch.
   *
   * @public
   */
  public readonly defaultBranch = signal('main');
  /**
   * GitHub account selected for repository inspection.
   *
   * @public
   */
  public readonly githubAccountId = signal('');
  /**
   * CLI account selected to staff the proposed project team.
   *
   * @public
   */
  public readonly cliAccountId = signal('');
  /**
   * Existing work source selected for the proposal.
   *
   * @public
   */
  public readonly sourceId = signal('');
  /**
   * Discovered provider project selected as a proposed work source.
   *
   * @public
   */
  public readonly projectId = signal('');
  /**
   * The projects projection or command.
   *
   * @public
   */
  public readonly projects = signal<readonly IGitHubProjectCandidate[]>([]);
  /**
   * The workflows projection or command.
   *
   * @public
   */
  public readonly workflows = signal<readonly ICiWorkflow[]>([]);
  /**
   * The connections projection or command.
   *
   * @public
   */
  public readonly connections = signal<ResponsePayload<'connections.get'> | undefined>(undefined);
  /**
   * Whether an onboarding operation is active.
   *
   * @public
   */
  public readonly busy = signal(false);
  /**
   * Actionable feedback from the current onboarding operation.
   *
   * @public
   */
  public readonly error = signal('');
  /**
   * Whether the current repository proposal has been inspected.
   *
   * @public
   */
  public readonly inspected = signal(false);
  /**
   * Whether the current proposal has been saved successfully.
   *
   * @public
   */
  public readonly applied = signal(false);
  /**
   * Ticket selected for the first read-only analysis.
   *
   * @public
   */
  public readonly ticketId = signal('');
  /**
   * The target name projection or command.
   *
   * @public
   */
  public readonly targetName = signal('');
  /**
   * The target kind projection or command.
   *
   * @public
   */
  public readonly targetKind = signal<IDeliveryTarget['kind']>('environment');
  /**
   * The target production projection or command.
   *
   * @public
   */
  public readonly targetProduction = signal(false);
  /**
   * The target workflow id projection or command.
   *
   * @public
   */
  public readonly targetWorkflowId = signal('');
  /**
   * The version input projection or command.
   *
   * @public
   */
  public readonly versionInput = signal('');
  /**
   * The environment input projection or command.
   *
   * @public
   */
  public readonly environmentInput = signal('');
  /**
   * The operation input projection or command.
   *
   * @public
   */
  public readonly operationInput = signal('');
  /**
   * The workspaces projection or command.
   *
   * @public
   */
  public readonly workspaces = computed(
    () => this.base()?.workspaces.filter((item) => item.enabled) ?? [],
  );
  /**
   * The repositories projection or command.
   *
   * @public
   */
  public readonly repositories = computed(
    () =>
      this.base()?.repositoryBindings.filter(
        (item) => item.workspaceId === this.workspaceId() && item.enabled,
      ) ?? [],
  );
  /**
   * The sources projection or command.
   *
   * @public
   */
  public readonly sources = computed(
    () =>
      this.base()?.workItemSources.filter(
        (item) => item.workspaceId === this.workspaceId() && item.enabled,
      ) ?? [],
  );
  /**
   * The cli accounts projection or command.
   *
   * @public
   */
  public readonly cliAccounts = computed(
    () =>
      this.base()?.connections.filter(
        (item) =>
          item.workspaceId === this.workspaceId() &&
          ['codex', 'claude', 'opencode'].includes(item.kind),
      ) ?? [],
  );
  /**
   * The github accounts projection or command.
   *
   * @public
   */
  public readonly githubAccounts = computed(() => this.connections()?.github.accounts ?? []);
  /**
   * The project projection or command.
   *
   * @public
   */
  public readonly project = computed(() =>
    this.projects().find((item) => item.id === this.projectId()),
  );
  /**
   * The selected workflow projection or command.
   *
   * @public
   */
  public readonly selectedWorkflow = computed(() =>
    this.workflows().find((item) => item.id === this.targetWorkflowId()),
  );
  /**
   * The tickets projection or command.
   *
   * @public
   */
  public readonly tickets = computed(() =>
    this.store
      .scopedWorkItems()
      .filter(
        (item) =>
          item.sourceId ===
            this.proposal()?.workItemSources.find(
              (source) => source.id === (this.sourceId() || `setup-${this._id}-source`),
            )?.id &&
          resolveWorkItemActions(
            item,
            this.store.snapshot()?.executions ?? [],
            this.store.snapshot()?.workflow?.stages ?? [],
            this.store.snapshot()?.executionQueue ?? [],
          ).some((action) => action.kind === 'analyze'),
      ),
  );
  /**
   * The proposal projection or command.
   *
   * @public
   */
  public readonly proposal = computed<IApplicationSettings | undefined>(() => {
    const base = this.base();
    if (!base || !this.workspaceId() || !this.cliAccountId()) return undefined;
    let draft = base;
    const workspaceId = this.workspaceId();
    let repository = this.repositories().find((item) => item.id === this.repositoryId());
    if (!repository) {
      const pieces = this.repositoryName().trim().split('/');
      const account = this.githubAccounts().find((item) => item.id === this.githubAccountId());
      if (
        pieces.length !== 2 ||
        !pieces.every((piece) => /^[a-zA-Z0-9_.-]+$/u.test(piece)) ||
        !account
      )
        return undefined;
      const connection: ProviderConnection = {
        id: `setup-${this._id}-github`,
        workspaceId,
        kind: 'github',
        displayName: account.login,
        hostname: account.hostname,
        accountLogin: account.login,
        gitProtocol: account.gitProtocol ?? 'https',
      };
      repository = {
        id: `setup-${this._id}-repository`,
        workspaceId,
        sourceControlConnectionId: connection.id,
        displayName: pieces.join('/'),
        provider: 'github',
        host: account.hostname,
        owner: pieces[0]!,
        name: pieces[1]!,
        defaultBranch: this.defaultBranch(),
        localPath: '',
        enabled: true,
      };
      draft = {
        ...draft,
        connections: [...draft.connections, connection],
        repositoryBindings: [...draft.repositoryBindings, repository],
      };
    }
    const source = this.sources().find((item) => item.id === this.sourceId());
    const project = this.project();
    if (!source && project) {
      const newSource = {
        id: `setup-${this._id}-source`,
        workspaceId,
        connectionId: repository.sourceControlConnectionId,
        provider: 'github-projects' as const,
        displayName: project.title,
        ownerType: project.ownerType,
        owner: project.owner,
        projectNumber: project.projectNumber,
        enabled: true,
      };
      draft = { ...draft, workItemSources: [...draft.workItemSources, newSource] };
    }
    const sourceIds = source ? [source.id] : project ? [`setup-${this._id}-source`] : [];
    const team = createSetupTeam(draft, workspaceId, this.cliAccountId(), repository.id);
    draft = team.settings;
    const ci = draft.ciBindings.find(
      (item) => item.repositoryBindingId === repository!.id && item.enabled,
    );
    const ciId = ci?.id ?? `setup-${this._id}-ci`;
    if (!ci)
      draft = {
        ...draft,
        ciBindings: [
          ...draft.ciBindings,
          {
            id: ciId,
            workspaceId,
            repositoryBindingId: repository.id,
            sourceControlConnectionId: repository.sourceControlConnectionId,
            provider: repository.provider === 'github' ? 'github-actions' : 'simulated',
            displayName: `${repository.displayName} Actions`,
            enabled: true,
          },
        ],
      };
    const context = draft.deliveryContexts.find(
      (item) =>
        item.enabled &&
        item.workspaceId === workspaceId &&
        item.repositoryBindingIds.includes(repository.id) &&
        sourceIds.some((id) => item.workItemSourceIds.includes(id)),
    );
    const contextId = context?.id ?? `setup-${this._id}-context`;
    if (sourceIds.length)
      draft = {
        ...draft,
        deliveryContexts: [
          ...draft.deliveryContexts.filter((item) => item.id !== contextId),
          {
            ...context,
            id: contextId,
            workspaceId,
            displayName: repository.displayName,
            workItemSourceIds: [...new Set([...(context?.workItemSourceIds ?? []), ...sourceIds])],
            repositoryBindingIds: [
              ...new Set([...(context?.repositoryBindingIds ?? []), repository.id]),
            ],
            ciBindingIds: [...new Set([...(context?.ciBindingIds ?? []), ciId])],
            agentTeamId: team.teamId,
            defaultRepositoryBindingId: repository.id,
            enabled: true,
          },
        ],
      };
    if (this.targetName())
      draft = {
        ...draft,
        deliveryTargets: [
          ...(draft.deliveryTargets ?? []).filter((item) => item.id !== `setup-${this._id}-target`),
          {
            id: `setup-${this._id}-target`,
            workspaceId,
            repositoryBindingId: repository.id,
            displayName: this.targetName(),
            kind: this.targetKind(),
            environment: this.targetName(),
            production: this.targetProduction() || this.targetName().toLowerCase() === 'production',
            workflowId: this.targetWorkflowId() || undefined,
            versionInput: this.versionInput() || undefined,
            environmentInput: this.environmentInput() || undefined,
            operationInput: this.operationInput() || undefined,
          },
        ],
      };
    return { ...draft, activeViewScope: { ...draft.activeViewScope, workspaceIds: [workspaceId] } };
  });
  /**
   * The load command projection or command.
   *
   * @public
   */
  public readonly loadCommand = new Command<void>(() => void this.load());
  /**
   * The change workspace command projection or command.
   *
   * @public
   */
  public readonly changeWorkspaceCommand = new Command<string>(
    (args) => void this.changeWorkspace(args),
  );
  /**
   * The inspect command projection or command.
   *
   * @public
   */
  public readonly inspectCommand = new Command<void>(() => void this.inspect());
  /**
   * The apply command projection or command.
   *
   * @public
   */
  public readonly applyCommand = new Command<void>(() => void this.apply());
  /**
   * Analysis is available only when both owning capabilities are included.
   *
   * @public
   * @readonly
   */
  public readonly canAnalyse = computed(() =>
    Boolean(this.store.prepareRepository && this.store.startAnalyzer),
  );
  /**
   * The analyse command projection or command.
   *
   * @public
   */
  public readonly analyseCommand = new Command<void>(() => void this.analyse(), this.canAnalyse);
  /**
   * The install command projection or command.
   *
   * @public
   */
  public readonly installCommand = new Command<'codex' | 'claude' | 'opencode'>(
    (args) => void this.install(args),
  );
  /**
   * The changed command projection or command.
   *
   * @public
   */
  public readonly changedCommand = new Command<void>(() => void this.changed());
  /**
   * Leaves the draft unapplied and closes the sheet.
   *
   * @public
   * @readonly
   */
  public readonly leaveDraftCommand = new Command<void>(() => this._sheet?.close());
  /**
   * Closes the sheet and opens the workspace's expert settings in the Settings window: its
   * connected services, where accounts, repositories and work sources are configured.
   *
   * @public
   * @readonly
   */
  public readonly openExpertSettingsCommand = new Command<void>(() => {
    this._sheet?.close();
    const workspace = this.workspaceId();
    void this._router.navigate(['/main/settings'], {
      queryParams: workspace ? { workspace, section: 'services' } : { section: 'workspaces' },
    });
  });
  /**
   * The authenticated accounts projection or command.
   *
   * @public
   */
  public readonly authenticatedAccounts = computed(
    () =>
      new Set(
        [
          ...(this.connections()?.codex.accounts ?? []),
          ...(this.connections()?.claude.accounts ?? []),
        ]
          .filter((account) => account.authenticated)
          .map((account) => account.id),
      ),
  );
  // #endregion
  // #region Methods
  /**
   * The override projection or command.
   *
   * @public
   */
  public override initialize(): void {
    super.initialize();
    void this.load();
  }
  /**
   * The async projection or command.
   *
   * @private
   */
  private async load(): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.initialize();
      this.base.set(this.store.settings());
      const requested = this.base()?.workspaces.find(
        (workspace) => workspace.id === this._request?.workspaceId,
      )?.id;
      const workspaceId =
        requested ?? this.store.selectedWorkspaceIds()[0] ?? this.base()?.workspaces[0]?.id ?? '';
      this.workspaceId.set(workspaceId);
      this.cliAccountId.set(this.cliAccounts()[0]?.id ?? '');
      this.repositoryId.set(this.repositories()[0]?.id ?? '');
      this.sourceId.set(this.sources()[0]?.id ?? '');
      this.connections.set(await this._client.request('connections.get', {}));
      this.githubAccountId.set(this.githubAccounts()[0]?.id ?? '');
    } catch {
      this.error.set('Accounts could not be detected. Retry or open account settings.');
    } finally {
      this.busy.set(false);
    }
  }
  /**
   * Resets dependent proposal choices for the selected workspace.
   *
   * @private
   */
  private changeWorkspace(id: string): void {
    this.workspaceId.set(id);
    this.repositoryId.set('');
    this.cliAccountId.set(this.cliAccounts()[0]?.id ?? '');
    this.sourceId.set('');
    this.projects.set([]);
    this.projectId.set('');
    this.applied.set(false);
    this.inspected.set(false);
  }
  /**
   * The async projection or command.
   *
   * @private
   */
  private async inspect(): Promise<void> {
    const proposal = this.proposal();
    if (!proposal || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const repository = this.repository(proposal);
      if (repository.provider === 'simulated') {
        this.inspected.set(true);
        return;
      }
      const [inspection, projects] = await Promise.all([
        this._client.request('setup.repository.inspect', {
          settings: applicationSettingsSchema.parse(proposal),
          repositoryBindingId: repository.id,
        }),
        this._client.request('github.projects.list', {
          workspaceId: this.workspaceId(),
          connectionId: repository.sourceControlConnectionId,
          draftSettings: applicationSettingsSchema.parse(proposal),
        }),
      ]);
      this.defaultBranch.set(inspection.defaultBranch);
      this.workflows.set(
        inspection.workflows.filter((workflow) => workflow.repositoryBindingId === repository.id),
      );
      this.projects.set(projects.projects.filter((project) => !project.closed));
      this.projectId.set(this.projects()[0]?.id ?? '');
      if (projects.error) this.error.set(projects.error);
      this.inspected.set(true);
    } catch (cause) {
      this.error.set(
        cause instanceof Error
          ? cause.message
          : 'Repository discovery failed. Check the GitHub account.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  /**
   * The async projection or command.
   *
   * @private
   */
  private async apply(): Promise<void> {
    const proposal = this.proposal();
    if (!proposal || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.targetWorkflowId() && !this.versionInput())
        throw new Error(
          'Choose the workflow input that accepts the immutable version before applying.',
        );
      if (!this.sourceId() && !this.project())
        throw new Error('Choose a work source before applying.');
      if (
        await this.store.saveSettings(
          applicationSettingsSchema.parse(proposal),
          'Project connections saved.',
        )
      ) {
        this.applied.set(true);
        await this.store.refresh();
        this.ticketId.set(this.tickets()[0]?.id ?? '');
      }
    } catch (cause) {
      this.error.set(cause instanceof Error ? cause.message : 'The proposal could not be saved.');
    } finally {
      this.busy.set(false);
    }
  }
  /**
   * The async projection or command.
   *
   * @private
   */
  private async analyse(): Promise<void> {
    const settings = this.proposal();
    if (!settings || !this.applied() || !this.ticketId() || this.busy()) return;
    this.busy.set(true);
    try {
      const repository = this.repository(settings);
      if (!this.store.prepareRepository || !(await this.store.prepareRepository(repository.id))) {
        this.error.set(
          'Repository preparation failed. Open repository settings to fix the folder or account, then retry.',
        );
        return;
      }
      if (
        this.store.startAnalyzer &&
        (await this.store.startAnalyzer(false, this.ticketId(), undefined, 'once'))
      )
        this.showAnalysis();
      else
        this.error.set(
          'The analysis could not start. Check the selected ticket, account and skill in expert settings, then retry.',
        );
    } finally {
      this.busy.set(false);
    }
  }
  /**
   * The async projection or command.
   *
   * @private
   */
  private async install(runtime: 'codex' | 'claude' | 'opencode'): Promise<void> {
    this.busy.set(true);
    try {
      await this._client.request('runtime-dependencies.install', { command: runtime });
      await this.load();
    } catch {
      this._notifications.showError(
        'CLI installation failed. Open account settings to resolve it.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  /**
   * Invalidates confirmation after a proposal field changes.
   *
   * @private
   */
  private changed(): void {
    this.applied.set(false);
    this.inspected.set(false);
  }
  private repository(settings: IApplicationSettings): IRepositoryBinding {
    const repository = settings.repositoryBindings.find(
      (item) => item.id === (this.repositoryId() || `setup-${this._id}-repository`),
    );
    if (!repository) throw new Error('Choose a repository.');
    return repository;
  }
  /**
   * Shows the started analysis: as a sheet of the Settings window the main window comes forward,
   * where the board shows the running analysis; as a page the board opens on the ticket.
   */
  private showAnalysis(): void {
    if (this._sheet) {
      this._sheet.close();
      void this._desktop?.request('window.show', { route: 'current' });
      return;
    }
    void this._router.navigate(['/main/board'], {
      queryParams: { item: this.ticketId(), process: 'true' },
    });
  }

  // #endregion
}
