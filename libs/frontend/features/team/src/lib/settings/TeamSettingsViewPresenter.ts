// #region Imports

import { computed, effect, inject, Injectable } from '@angular/core';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { Command } from '@symphony/frontend-core';
import {
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsEditorService,
  SettingsHostSession,
  type ISettingsEditorRequest,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AI_RUNTIME_LABELS } from '@symphony/frontend-ui';
import { TEAM_SETTINGS_CONTEXT } from '../ports/TeamSettingsContextToken';
import { projectWorkspaceOrganization } from './workspace-organization/projectWorkspaceOrganization';
import type { IWorkspaceOrganizationView } from './workspace-organization/IWorkspaceOrganizationView';
import type { IWorkspaceAgentFallbackView } from './workspace-organization/IWorkspaceAgentFallbackView';
import {
  agentIntelligenceIndex,
  modelIntelligenceTargets,
  teamIntelligenceTotal,
} from './model-intelligence';
import { agentRemovalBlockers, withoutAgent } from './agent-removal';

// #endregion

/** Owns the workspace Team card's organization, usage projections and commands. @public */
@Injectable()
export class TeamSettingsViewPresenter {
  // #region Fields
  /** Bounded Team settings and optional runtime operations. @public @readonly */
  public readonly store = inject(TEAM_SETTINGS_CONTEXT);
  private readonly _settingsEditors = inject(SettingsEditorService);
  private readonly _settingsHost = inject(SettingsHostSession);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT);
  /** Workspace selected by the existing native Settings host. @public @readonly */
  public readonly workspace = computed(() =>
    this.store.settings()?.workspaces.find((item) => item.id === this._selection.workspaceId()),
  );

  private readonly _messageBoxService = inject(MessageBoxService);

  private readonly _organizationByWorkspace = computed(() => {
    const settings = this.store.settings();
    return new Map(
      settings?.workspaces.map((workspace) => [
        workspace.id,
        projectWorkspaceOrganization(settings, workspace.id),
      ]) ?? [],
    );
  });

  /** Last requested (model, effort) set; refetching only on change keeps the daily API budget. */
  private _requestedIntelligenceTargetsKey = '';

  private readonly _workspaceOrganization = computed(
    () => (workspaceId: string) => this.resolveWorkspaceOrganization(workspaceId),
  );

  private readonly _openAgentAccountCommand: Command<
    readonly [workspaceId: string, agentProfileId: string]
  > = new Command((parameters) => void this.onExecuteOpenAgentAccountCommand(...parameters));

  private readonly _openAiConnectionCommand: Command<
    readonly [workspaceId: string, connectionId?: string, agentProfileId?: string]
  > = new Command((parameters) => void this.onExecuteOpenAiConnectionCommand(...parameters));

  private readonly _agentSummary = computed(
    () => (agent: IWorkspaceOrganizationView['agents'][number]) => this.resolveAgentSummary(agent),
  );

  private readonly _modelIntelligenceIssue = computed(() => this.resolveModelIntelligenceIssue());

  private readonly _teamIntelligence = computed(
    () => (agents: IWorkspaceOrganizationView['agents']) => this.resolveTeamIntelligence(agents),
  );

  private readonly _accountExhausted = computed(
    () => (connectionId: string) => this.resolveAccountExhausted(connectionId),
  );

  private readonly _agentProviderSummary = computed(
    () => (agent: IWorkspaceOrganizationView['agents'][number]) =>
      this.resolveAgentProviderSummary(agent),
  );

  private readonly _confirmRemoveAgentCommand: Command<
    IWorkspaceOrganizationView['agents'][number]
  > = new Command((agent) => void this.onExecuteConfirmRemoveAgentCommand(agent));

  private readonly _agentFallbackSummary = computed(
    () => (fallback: IWorkspaceAgentFallbackView) => this.resolveAgentFallbackSummary(fallback),
  );
  // #endregion
  // #region Ctor
  /** Starts only projections required by the mounted Team card. @public */
  public constructor() {
    effect(() => {
      if (!this.store.aiAvailable) return;
      const settings = this.store.settings();
      if (!settings) return;
      const targets = modelIntelligenceTargets(settings);
      const key = JSON.stringify(targets);
      if (!targets.length || key === this._requestedIntelligenceTargetsKey) return;
      this._requestedIntelligenceTargetsKey = key;
      void this.store.refreshModelIntelligence({ targets });
    });
    effect(() => {
      if (!this.store.aiAvailable) return;
      // accountExhausted() needs the quota windows; nothing else in the app loads them.
      for (const connection of this.store.settings()?.connections ?? []) {
        if (
          (connection.kind === 'codex' ||
            connection.kind === 'claude' ||
            connection.kind === 'opencode') &&
          this.store.aiUsageFor(connection.id) === undefined &&
          !this.store.aiUsageBusyFor(connection.id)
        ) {
          void this.store.refreshAiUsage({
            connectionId: connection.id,
            provider: connection.kind,
          });
        }
      }
    });
  }
  // #endregion
  // #region Properties

  /**
   * The workspaceOrganization projection.
   *
   * @public
   * @readonly
   */
  public get workspaceOrganization() {
    return this._workspaceOrganization;
  }

  /**
   * The openAgentAccount command.
   *
   * @public
   * @readonly
   */
  public get openAgentAccountCommand(): Command<
    readonly [workspaceId: string, agentProfileId: string]
  > {
    return this._openAgentAccountCommand;
  }

  /**
   * The openAiConnection command.
   *
   * @public
   * @readonly
   */
  public get openAiConnectionCommand(): Command<
    readonly [workspaceId: string, connectionId?: string, agentProfileId?: string]
  > {
    return this._openAiConnectionCommand;
  }

  /**
   * The agentSummary projection.
   *
   * @public
   * @readonly
   */
  public get agentSummary() {
    return this._agentSummary;
  }

  /**
   * The modelIntelligenceIssue projection.
   *
   * @public
   * @readonly
   */
  public get modelIntelligenceIssue() {
    return this._modelIntelligenceIssue;
  }

  /**
   * The teamIntelligence projection.
   *
   * @public
   * @readonly
   */
  public get teamIntelligence() {
    return this._teamIntelligence;
  }

  /**
   * The accountExhausted projection.
   *
   * @public
   * @readonly
   */
  public get accountExhausted() {
    return this._accountExhausted;
  }

  /**
   * The agentProviderSummary projection.
   *
   * @public
   * @readonly
   */
  public get agentProviderSummary() {
    return this._agentProviderSummary;
  }

  /**
   * The confirmRemoveAgent command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveAgentCommand(): Command<IWorkspaceOrganizationView['agents'][number]> {
    return this._confirmRemoveAgentCommand;
  }

  /**
   * The agentFallbackSummary projection.
   *
   * @public
   * @readonly
   */
  public get agentFallbackSummary() {
    return this._agentFallbackSummary;
  }
  // #endregion
  // #region Methods

  /**
   * Returns the workspace organization.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveWorkspaceOrganization(workspaceId: string): IWorkspaceOrganizationView {
    return (
      this._organizationByWorkspace().get(workspaceId) ?? {
        positions: [],
        agents: [],
        teams: [],
        providers: [],
        routes: [],
      }
    );
  }

  /**
   * Opens the agent account.
   *
   * @param workspaceId - Workspace id.
   * @param agentProfileId - Agent profile id.
   * @private
   */
  private onExecuteOpenAgentAccountCommand(workspaceId: string, agentProfileId: string): void {
    this.onExecuteOpenAiConnectionCommand(workspaceId, undefined, agentProfileId);
  }

  /**
   * Opens the AI connection.
   *
   * @param workspaceId - Workspace id.
   * @param connectionId - Connection id.
   * @param agentProfileId - Agent profile id.
   * @private
   */
  private onExecuteOpenAiConnectionCommand(
    workspaceId: string,
    connectionId?: string,
    agentProfileId?: string,
  ): void {
    this.openEditor({ kind: 'ai', workspaceId, connectionId, agentProfileId });
  }

  /** Sub-label of an agent row: position, AI account, model, and availability. */
  /**
   * One line under the agent name. The provider is not repeated in words — its avatar already
   * carries it — and availability reflects the account quota, not just the enabled flag.
   *
   * @param agent - Agent.
   * @private
   */
  private resolveAgentSummary(agent: IWorkspaceOrganizationView['agents'][number]): string {
    const intelligence = this.agentIntelligence(agent);
    return [
      agent.positionDisplayName,
      ...(agent.accountKind ? [] : ['No AI account']),
      agent.model,
      this.agentAvailability(agent),
      ...(intelligence === undefined ? [] : [`Intelligence ${intelligence}`]),
    ]
      .filter((part): part is string => Boolean(part))
      .join(' · ');
  }

  /**
   * Why no intelligence scores can be shown; rendered once under the list, not per row.
   *
   * @private
   */
  private resolveModelIntelligenceIssue(): string | undefined {
    return this.store.modelIntelligence()?.error;
  }

  /**
   * Artificial Analysis intelligence index of the agent's preferred model and effort.
   *
   * @param agent - Agent.
   * @private
   */
  private agentIntelligence(
    agent: IWorkspaceOrganizationView['agents'][number],
  ): number | undefined {
    const scores = this.store.modelIntelligence()?.scores;
    if (!scores) return undefined;
    const index = agentIntelligenceIndex(agent, scores);
    return index === null ? undefined : Math.round(index);
  }

  /**
   * Combined index of the workspace's chained agents: the individual scores added up.
   *
   * @param agents - Agents.
   * @private
   */
  private resolveTeamIntelligence(
    agents: IWorkspaceOrganizationView['agents'],
  ): number | undefined {
    const scores = this.store.modelIntelligence()?.scores;
    if (!scores) return undefined;
    const total = teamIntelligenceTotal(agents, scores);
    return total === null ? undefined : Math.round(total);
  }

  /**
   * Availability of the agent's routes. An exhausted preferred account still leaves the agent
   * usable when a backup has quota, which is what "Backup in use" reports.
   *
   * @param agent - Agent.
   * @private
   */
  private agentAvailability(agent: IWorkspaceOrganizationView['agents'][number]): string {
    if (!agent.enabled) return 'Unavailable';
    const preferredExhausted = agent.accountId
      ? this.resolveAccountExhausted(agent.accountId)
      : false;
    if (!preferredExhausted) return 'Available';
    const usableBackup = agent.fallbacks.some(
      (fallback) => !this.resolveAccountExhausted(fallback.accountId),
    );
    return usableBackup ? 'Backup in use · preferred account out of quota' : 'Out of quota';
  }

  /**
   * True when every reported usage window of the account is used up.
   *
   * @param connectionId - Connection id.
   * @private
   */
  private resolveAccountExhausted(connectionId: string): boolean {
    const windows = this.store.aiUsageFor(connectionId);
    if (!windows?.length) return false;
    return windows.every((window) => window.remainingPercent <= 0);
  }

  /**
   * Tooltip of the provider avatar: which workspace account this agent runs on.
   *
   * @param agent - Agent.
   * @private
   */
  private resolveAgentProviderSummary(agent: IWorkspaceOrganizationView['agents'][number]): string {
    if (!agent.accountKind) return 'No AI account assigned';
    const provider = AI_RUNTIME_LABELS[agent.accountKind];
    return agent.accountDisplayName ? `${provider} · ${agent.accountDisplayName}` : provider;
  }

  /**
   * Confirms the remove agent.
   *
   * @param agent - Agent.
   * @private
   */
  private onExecuteConfirmRemoveAgentCommand(
    agent: IWorkspaceOrganizationView['agents'][number],
  ): void {
    const settings = this.requireSettings();
    const [blocker] = agentRemovalBlockers(settings, agent.id);
    if (blocker) {
      this._messageBoxService.show({
        id: `remove-agent-blocked-${agent.id}`,
        header: 'This agent cannot be removed',
        message:
          blocker === 'last-agent'
            ? 'A workspace needs at least one AI agent. Add another agent first, then remove this one.'
            : 'This agent is the only Work Item Creator while a Teams feedback intake is enabled. Assign that responsibility to another agent or disable the intake first.',
        buttons: 'ok',
        variant: 'warning',
        pressEscapeToClose: true,
      });
      return;
    }
    const confirmation = this._messageBoxService.show({
      id: `remove-agent-${agent.id}`,
      header: `Remove ${agent.displayName}?`,
      message:
        'Symphony removes the agent, its position, and its routing. Its responsibilities move to another agent that is allowed to take them; the AI account itself stays connected.',
      buttons: 'yesNo',
      variant: 'danger',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Remove agent', noLabel: 'Keep agent' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason !== 'positive') return;
      void this.store.saveSettings(withoutAgent(this.requireSettings(), agent.id));
    });
  }

  /**
   * Tooltip for a backup avatar: the account it falls over to, with its model and effort.
   *
   * @param fallback - Fallback.
   * @private
   */
  private resolveAgentFallbackSummary(fallback: IWorkspaceAgentFallbackView): string {
    return [
      `Backup: ${fallback.accountDisplayName}`,
      AI_RUNTIME_LABELS[fallback.accountKind],
      ...(fallback.model ? [fallback.model] : []),
      ...(fallback.reasoningEffort ? [`${fallback.reasoningEffort} effort`] : []),
    ].join(' · ');
  }

  private openEditor<TRequest extends ISettingsEditorRequest>(data: TRequest): void {
    void this._settingsEditors.open(data, (workspaceId, section) => {
      if (workspaceId) this._settingsHost.openWorkspace(workspaceId, section);
      else this._settingsHost.selectWorkspaceSection(section);
    });
  }

  private requireSettings(): ApplicationSettingsDto {
    const settings = this.store.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  // #endregion
}
