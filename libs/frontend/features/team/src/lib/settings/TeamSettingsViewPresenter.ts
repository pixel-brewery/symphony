// #region Imports

import { computed, effect, inject, Injectable } from '@angular/core';
import { Command } from '@symphony/frontend-core';
import {
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
  type ISettingsEditorRequest,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { AgentAvailability } from '../models/AgentAvailability';
import { TEAM_SETTINGS_CONTEXT } from '../ports/TeamSettingsContextToken';
import { projectDeliveryFlow } from './delivery-flow/projectDeliveryFlow';
import type { IDeliveryFlowStepView } from './delivery-flow/IDeliveryFlowStepView';
import { projectWorkspaceOrganization } from './workspace-organization/projectWorkspaceOrganization';
import type { IWorkspaceOrganizationView } from './workspace-organization/IWorkspaceOrganizationView';
import {
  agentIntelligenceIndex,
  modelIntelligenceTargets,
  teamIntelligenceTotal,
} from './model-intelligence';
import { agentRemovalBlockers, withoutAgent } from './agent-removal';

// #endregion

/**
 * Owns the `AI team` section of a workspace: its delivery flow, agent cards, technical setup,
 * usage projections and commands.
 *
 * @public
 */
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

  private readonly _alerts = inject(SettingsAlertService);

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

  private readonly _deliveryFlow = computed(
    () => (workspaceId: string) => this.resolveDeliveryFlow(workspaceId),
  );

  private readonly _agentAvailability = computed(
    () => (agent: IWorkspaceOrganizationView['agents'][number]) =>
      this.resolveAgentAvailability(agent),
  );

  private readonly _agentIntelligence = computed(
    () => (agent: IWorkspaceOrganizationView['agents'][number]) =>
      this.resolveAgentIntelligence(agent),
  );

  private readonly _modelIntelligenceIssue = computed(() => this.resolveModelIntelligenceIssue());

  private readonly _teamIntelligence = computed(
    () => (agents: IWorkspaceOrganizationView['agents']) => this.resolveTeamIntelligence(agents),
  );

  private readonly _accountExhausted = computed(
    () => (connectionId: string) => this.resolveAccountExhausted(connectionId),
  );

  private readonly _confirmRemoveAgentCommand: Command<
    IWorkspaceOrganizationView['agents'][number]
  > = new Command((agent) => void this.onExecuteConfirmRemoveAgentCommand(agent));

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
   * Who does each delivery-flow step of a workspace, with the backups after the preferred agent.
   *
   * @public
   * @readonly
   */
  public get deliveryFlow() {
    return this._deliveryFlow;
  }

  /**
   * Whether an agent can currently run, judged by its accounts' quota.
   *
   * @public
   * @readonly
   */
  public get agentAvailability() {
    return this._agentAvailability;
  }

  /**
   * Intelligence index of an agent's preferred model and effort, when scores are known.
   *
   * @public
   * @readonly
   */
  public get agentIntelligence() {
    return this._agentIntelligence;
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
   * The confirmRemoveAgent command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveAgentCommand(): Command<IWorkspaceOrganizationView['agents'][number]> {
    return this._confirmRemoveAgentCommand;
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

  /**
   * Returns the delivery flow of a workspace.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveDeliveryFlow(workspaceId: string): readonly IDeliveryFlowStepView[] {
    return projectDeliveryFlow(this.resolveWorkspaceOrganization(workspaceId));
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
  private resolveAgentIntelligence(
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
  private resolveAgentAvailability(
    agent: IWorkspaceOrganizationView['agents'][number],
  ): AgentAvailability {
    if (!agent.enabled) return 'unavailable';
    const preferredExhausted = agent.accountId
      ? this.resolveAccountExhausted(agent.accountId)
      : false;
    if (!preferredExhausted) return 'available';
    const usableBackup = agent.fallbacks.some(
      (fallback) => !this.resolveAccountExhausted(fallback.accountId),
    );
    return usableBackup ? 'backup-in-use' : 'out-of-quota';
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
   * Confirms the remove agent.
   *
   * @param agent - Agent.
   * @private
   */
  private async onExecuteConfirmRemoveAgentCommand(
    agent: IWorkspaceOrganizationView['agents'][number],
  ): Promise<void> {
    const settings = this.requireSettings();
    const [blocker] = agentRemovalBlockers(settings, agent.id);
    if (blocker) {
      await this._alerts.confirm({
        id: `remove-agent-blocked-${agent.id}`,
        header: 'This agent cannot be removed',
        message:
          blocker === 'last-agent'
            ? 'A workspace needs at least one AI agent. Add another agent first, then remove this one.'
            : 'This agent is the only Work Item Creator while a Teams feedback intake is enabled. Assign that responsibility to another agent or disable the intake first.',
        tone: 'warning',
        confirmLabel: 'OK',
      });
      return;
    }
    const confirmed = await this._alerts.confirm({
      id: `remove-agent-${agent.id}`,
      header: `Remove ${agent.displayName}?`,
      message:
        'Symphony removes the agent, its position, and its routing. Its responsibilities move to another agent that is allowed to take them; the AI account itself stays connected.',
      confirmLabel: 'Remove agent',
      cancelLabel: 'Keep agent',
      destructive: true,
    });
    if (confirmed) await this.store.saveSettings(withoutAgent(this.requireSettings(), agent.id));
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
