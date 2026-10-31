// #region Imports

import {
  Injectable,
  ApplicationRef,
  ChangeDetectorRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import { defaultAgentAppearance, type IAgentAppearance } from '@symphony/domain-team';
import { type CodexConfigurationDto } from '@symphony/ipc-contracts-ai';
import {
  createTrackedSettingsDraft,
  upsertSettingsItem,
  mosaikEventValue,
  SettingsAlertService,
} from '@symphony/frontend-setting';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import { OpenCodeModelsPipe } from '../pipes/OpenCodeModelsPipe';
import { OpenCodeProvidersPipe } from '../pipes/OpenCodeProvidersPipe';
import { SettingNamePipe } from '../pipes/SettingNamePipe';
import {
  aiRuntimeValidationIssue,
  AI_RUNTIME_LABELS,
  deliveryFlowSteps,
  type IDeliveryFlowStep,
} from '@symphony/frontend-ui';
import { type AiConnection, type AiRuntimeKind } from '@symphony/frontend-core/ai';
import { type AiValidationIssue } from '../models/AiValidationIssue';
import { type IAiChoice } from '../models/IAiChoice';
import { type ApplicationSettingsDto as Settings } from '@symphony/ipc-contracts-composition';
import { type ITeamSettingsEditorRequest } from './ITeamSettingsEditorRequest';
import { TEAM_SETTINGS_CONTEXT } from '../ports/TeamSettingsContextToken';
import { synchronizeWorkspaceTeamConfiguration } from '../configuration/synchronizeWorkspaceTeamConfiguration';
import { skillFlowRoles as SKILL_FLOW_ROLES } from '@symphony/domain-skills';

// #endregion

type AiModelOption = CodexConfigurationDto['models'][number];

type RouteCostClass = Settings['agentRoutePolicies'][number]['candidates'][number]['costClass'];

/**
 * Claude Code documents moving aliases; the CLI resolves them to the current model. The card
 * shows the name alone, like every other provider's model list.
 */
const CLAUDE_MODEL_CHOICES: readonly IAiChoice[] = [
  { id: 'fable', label: 'Fable' },
  { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku', label: 'Haiku' },
];

/** Effort ladder shared by Claude Code (`--effort`) and OpenCode (`--variant`). */
const STATIC_EFFORT_CHOICES: readonly IAiChoice[] = [
  { id: 'low', label: 'Low', description: 'Fast answers, little deliberation' },
  { id: 'medium', label: 'Medium', description: 'Balanced speed and depth' },
  { id: 'high', label: 'High', description: 'Thorough reasoning for hard problems' },
  { id: 'max', label: 'Max', description: 'Maximum reasoning budget' },
];

type SkillFlowRole = Settings['positions'][number]['allowedRoles'][number];

function splitList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
type Connection = Settings['connections'][number];

/** Feature-owned agent and team form lifecycle and commands. @public */
@Injectable()
export class TeamSettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  /** Consumed state and configuration dependencies of the Team editor. @public @readonly */ public readonly store =
    inject(TEAM_SETTINGS_CONTEXT);
  /** Validated feature-owned drawer request. @public @readonly */ public readonly data =
    inject<ITeamSettingsEditorRequest>(DIALOG_REF_DATA);

  /**
   * The kind.
   *
   * @public
   * @readonly
   */
  public readonly kind = this.data.kind;

  private readonly _application = inject(ApplicationRef);

  private readonly _changeDetector = inject(ChangeDetectorRef);

  private readonly _alerts = inject(SettingsAlertService);
  private readonly _dialogRef = inject(DIALOG_REF);

  private readonly _openCodeModelsPipe = new OpenCodeModelsPipe();

  private readonly _openCodeProvidersPipe = new OpenCodeProvidersPipe();

  private readonly _settingNamePipe = new SettingNamePipe();

  private readonly _draftRevision = signal(0);

  /**
   * The busy.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);

  /**
   * The AI model search.
   *
   * @public
   * @readonly
   */
  public readonly aiModelSearch = signal('');

  /**
   * The AI connection ID.
   *
   * @public
   * @readonly
   */
  public readonly aiConnectionId = signal(this.initialAiConnectionId());

  /**
   * The AI.
   *
   * @public
   */
  public ai = this.createAiDraft();

  /** Available complete employee figures. @public */
  public readonly characterColors: readonly IAgentAppearance['color'][] = [
    'blue',
    'mint',
    'coral',
    'violet',
    'gold',
    'rose',
  ];

  /** Chooses a catalogue figure in the existing agent draft. @public */
  public readonly chooseAppearanceCommand = new Command<unknown>((event) => {
    const value = this.resolveEventText(event);
    const color = this.characterColors.find((candidate) => candidate === value);
    if (color) this.ai.appearance = { figure: 'dot', color, accessories: [] };
  });

  /**
   * The AI roles.
   *
   * @public
   * @readonly
   */
  public readonly aiRoles = SKILL_FLOW_ROLES;

  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(),
  );

  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );

  private readonly _canSave = this.createDraftProjection(() => this.resolveCanSave());

  private readonly _aiValidationIssues = this.createDraftProjection(() =>
    this.resolveAiValidationIssues(),
  );

  private readonly _eventText = computed(() => (event: unknown) => this.resolveEventText(event));

  private readonly _eventNumber = computed(
    () => (event: unknown) => this.resolveEventNumber(event),
  );

  private readonly _updateAiRouteStrategyCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiRouteStrategyCommand(event),
  );

  private readonly _aiAccounts = this.createDraftProjection(() => this.resolveAiAccounts());

  private readonly _aiFallbackAccounts = this.createDraftProjection(() =>
    this.resolveAiFallbackAccounts(),
  );

  private readonly _aiRuntimeLabel = computed(
    () => (kind: string) => this.resolveAiRuntimeLabel(kind),
  );

  private readonly _updateAiAccountCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiAccountCommand(event),
  );

  private readonly _openAiAccountEditorCommand: Command<void> = new Command(
    () => void this.onExecuteOpenAiAccountEditorCommand(),
  );

  private readonly _aiModelChoices = this.createDraftProjection(() => this.resolveAiModelChoices());

  private readonly _selectedAiModelChoice = this.createDraftProjection(() =>
    this.resolveSelectedAiModelChoice(),
  );

  private readonly _updateAiModelChoiceCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiModelChoiceCommand(event),
  );

  private readonly _aiEffortChoices = this.createDraftProjection(() =>
    this.resolveAiEffortChoices(),
  );

  private readonly _selectedAiEffortChoice = this.createDraftProjection(() =>
    this.resolveSelectedAiEffortChoice(),
  );

  private readonly _updateAiEffortChoiceCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiEffortChoiceCommand(event),
  );

  private readonly _openCodeProviderChoices = this.createDraftProjection(() =>
    this.resolveOpenCodeProviderChoices(),
  );

  private readonly _aiModelSearchVisible = this.createDraftProjection(() =>
    this.resolveAiModelSearchVisible(),
  );

  private readonly _aiModelsPending = this.createDraftProjection(() =>
    this.resolveAiModelsPending(),
  );

  private readonly _aiFallbackEnabled = computed(
    () => (connectionId: string) => this.resolveAiFallbackEnabled(connectionId),
  );

  private readonly _setAiFallbackCommand: Command<
    readonly [connectionId: string, enabled: boolean]
  > = new Command((parameters) => void this.onExecuteSetAiFallbackCommand(...parameters));

  private readonly _fallbackModelChoices = computed(
    () => (connection: AiConnection) => this.resolveFallbackModelChoices(connection),
  );

  private readonly _fallbackEffortChoices = this.createDraftProjection(() =>
    this.resolveFallbackEffortChoices(),
  );

  private readonly _fallbackModel = computed(
    () => (connectionId: string) => this.resolveFallbackModel(connectionId),
  );

  private readonly _fallbackEffort = computed(
    () => (connectionId: string) => this.resolveFallbackEffort(connectionId),
  );

  private readonly _updateFallbackModelCommand: Command<
    readonly [connectionId: string, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateFallbackModelCommand(...parameters));

  private readonly _updateFallbackEffortCommand: Command<
    readonly [connectionId: string, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateFallbackEffortCommand(...parameters));

  private readonly _aiRoleEnabled = computed(
    () => (role: SkillFlowRole) => this.resolveAiRoleEnabled(role),
  );

  private readonly _setAiRoleCommand: Command<readonly [role: SkillFlowRole, enabled: boolean]> =
    new Command((parameters) => void this.onExecuteSetAiRoleCommand(...parameters));

  private readonly _selectedAiProviderId = this.createDraftProjection(() =>
    this.resolveSelectedAiProviderId(),
  );

  private readonly _updateOpenCodeProviderCommand: Command<string> = new Command(
    (providerId) => void this.onExecuteUpdateOpenCodeProviderCommand(providerId),
  );

  private readonly _aiRuntimeAvailable = computed(
    () => (runtime: Connection['kind']) => this.resolveAiRuntimeAvailable(runtime),
  );

  private readonly _confirmInstallAiRuntimeCommand: Command<
    readonly [runtime: Connection['kind'], label: string]
  > = new Command(
    (parameters) => void this.onExecuteConfirmInstallAiRuntimeCommand(...parameters),
    computed(() => this.store.nativeInstallAvailable),
  );

  private readonly _refreshAiConfigurationCommand: Command<string | undefined> = new Command(
    (connectionId) => void this.onExecuteRefreshAiConfigurationCommand(connectionId),
  );

  private readonly _selectedAiAccount = this.createDraftProjection(() =>
    this.resolveSelectedAiAccount(),
  );

  private readonly _previewModel = this.createDraftProjection(() =>
    this.resolveAiModelChoices().find(
      (choice) => choice.id === this.resolveSelectedAiModelChoice(),
    ),
  );

  private readonly _previewEffort = this.createDraftProjection(() =>
    this.resolveAiEffortChoices().find(
      (choice) => choice.id === this.resolveSelectedAiEffortChoice(),
    ),
  );

  private readonly _selectedAccountProblem = this.createDraftProjection(() =>
    this.resolveSelectedAccountProblem(),
  );

  private readonly _deliveryFlowSteps = this.createDraftProjection(() =>
    this.resolveDeliveryFlowSteps(),
  );

  private readonly _previewFallback = this.createDraftProjection(() =>
    this.resolvePreviewFallback(),
  );
  // #endregion
  // #region Properties

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
   * The canSave projection.
   *
   * @public
   * @readonly
   */
  public get canSave() {
    return this._canSave;
  }

  /**
   * The aiValidationIssues projection.
   *
   * @public
   * @readonly
   */
  public get aiValidationIssues() {
    return this._aiValidationIssues;
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

  /**
   * The eventNumber projection.
   *
   * @public
   * @readonly
   */
  public get eventNumber() {
    return this._eventNumber;
  }

  /**
   * The updateAiRouteStrategy command.
   *
   * @public
   * @readonly
   */
  public get updateAiRouteStrategyCommand(): Command<unknown> {
    return this._updateAiRouteStrategyCommand;
  }

  /**
   * The aiAccounts projection.
   *
   * @public
   * @readonly
   */
  public get aiAccounts() {
    return this._aiAccounts;
  }

  /**
   * The aiFallbackAccounts projection.
   *
   * @public
   * @readonly
   */
  public get aiFallbackAccounts() {
    return this._aiFallbackAccounts;
  }

  /**
   * The aiRuntimeLabel projection.
   *
   * @public
   * @readonly
   */
  public get aiRuntimeLabel() {
    return this._aiRuntimeLabel;
  }

  /**
   * The updateAiAccount command.
   *
   * @public
   * @readonly
   */
  public get updateAiAccountCommand(): Command<unknown> {
    return this._updateAiAccountCommand;
  }

  /**
   * The openAiAccountEditor command.
   *
   * @public
   * @readonly
   */
  public get openAiAccountEditorCommand(): Command<void> {
    return this._openAiAccountEditorCommand;
  }

  /**
   * The aiModelChoices projection.
   *
   * @public
   * @readonly
   */
  public get aiModelChoices() {
    return this._aiModelChoices;
  }

  /**
   * The selectedAiModelChoice projection.
   *
   * @public
   * @readonly
   */
  public get selectedAiModelChoice() {
    return this._selectedAiModelChoice;
  }

  /**
   * The updateAiModelChoice command.
   *
   * @public
   * @readonly
   */
  public get updateAiModelChoiceCommand(): Command<unknown> {
    return this._updateAiModelChoiceCommand;
  }

  /**
   * The aiEffortChoices projection.
   *
   * @public
   * @readonly
   */
  public get aiEffortChoices() {
    return this._aiEffortChoices;
  }

  /**
   * The selectedAiEffortChoice projection.
   *
   * @public
   * @readonly
   */
  public get selectedAiEffortChoice() {
    return this._selectedAiEffortChoice;
  }

  /**
   * The updateAiEffortChoice command.
   *
   * @public
   * @readonly
   */
  public get updateAiEffortChoiceCommand(): Command<unknown> {
    return this._updateAiEffortChoiceCommand;
  }

  /**
   * The openCodeProviderChoices projection.
   *
   * @public
   * @readonly
   */
  public get openCodeProviderChoices() {
    return this._openCodeProviderChoices;
  }

  /**
   * The aiModelSearchVisible projection.
   *
   * @public
   * @readonly
   */
  public get aiModelSearchVisible() {
    return this._aiModelSearchVisible;
  }

  /**
   * The aiModelsPending projection.
   *
   * @public
   * @readonly
   */
  public get aiModelsPending() {
    return this._aiModelsPending;
  }

  /**
   * The aiFallbackEnabled projection.
   *
   * @public
   * @readonly
   */
  public get aiFallbackEnabled() {
    return this._aiFallbackEnabled;
  }

  /**
   * The setAiFallback command.
   *
   * @public
   * @readonly
   */
  public get setAiFallbackCommand(): Command<readonly [connectionId: string, enabled: boolean]> {
    return this._setAiFallbackCommand;
  }

  /**
   * The fallbackModelChoices projection.
   *
   * @public
   * @readonly
   */
  public get fallbackModelChoices() {
    return this._fallbackModelChoices;
  }

  /**
   * The fallbackEffortChoices projection.
   *
   * @public
   * @readonly
   */
  public get fallbackEffortChoices() {
    return this._fallbackEffortChoices;
  }

  /**
   * The fallbackModel projection.
   *
   * @public
   * @readonly
   */
  public get fallbackModel() {
    return this._fallbackModel;
  }

  /**
   * The fallbackEffort projection.
   *
   * @public
   * @readonly
   */
  public get fallbackEffort() {
    return this._fallbackEffort;
  }

  /**
   * The updateFallbackModel command.
   *
   * @public
   * @readonly
   */
  public get updateFallbackModelCommand(): Command<
    readonly [connectionId: string, event: unknown]
  > {
    return this._updateFallbackModelCommand;
  }

  /**
   * The updateFallbackEffort command.
   *
   * @public
   * @readonly
   */
  public get updateFallbackEffortCommand(): Command<
    readonly [connectionId: string, event: unknown]
  > {
    return this._updateFallbackEffortCommand;
  }

  /**
   * The aiRoleEnabled projection.
   *
   * @public
   * @readonly
   */
  public get aiRoleEnabled() {
    return this._aiRoleEnabled;
  }

  /**
   * The setAiRole command.
   *
   * @public
   * @readonly
   */
  public get setAiRoleCommand(): Command<readonly [role: SkillFlowRole, enabled: boolean]> {
    return this._setAiRoleCommand;
  }

  /**
   * The selectedAiProviderId projection.
   *
   * @public
   * @readonly
   */
  public get selectedAiProviderId() {
    return this._selectedAiProviderId;
  }

  /**
   * The updateOpenCodeProvider command.
   *
   * @public
   * @readonly
   */
  public get updateOpenCodeProviderCommand(): Command<string> {
    return this._updateOpenCodeProviderCommand;
  }

  /**
   * The aiRuntimeAvailable projection.
   *
   * @public
   * @readonly
   */
  public get aiRuntimeAvailable() {
    return this._aiRuntimeAvailable;
  }

  /**
   * The confirmInstallAiRuntime command.
   *
   * @public
   * @readonly
   */
  public get confirmInstallAiRuntimeCommand(): Command<
    readonly [runtime: Connection['kind'], label: string]
  > {
    return this._confirmInstallAiRuntimeCommand;
  }

  /**
   * The refreshAiConfiguration command.
   *
   * @public
   * @readonly
   */
  public get refreshAiConfigurationCommand(): Command<string | undefined> {
    return this._refreshAiConfigurationCommand;
  }

  /**
   * The AI account the agent runs on, for the preview.
   *
   * @public
   * @readonly
   */
  public get selectedAiAccount() {
    return this._selectedAiAccount;
  }

  /**
   * The chosen model card, for the preview.
   *
   * @public
   * @readonly
   */
  public get previewModel() {
    return this._previewModel;
  }

  /**
   * The chosen effort card, for the preview.
   *
   * @public
   * @readonly
   */
  public get previewEffort() {
    return this._previewEffort;
  }

  /**
   * Why the chosen account cannot run the agent: its CLI is missing or it is not signed in.
   *
   * @public
   * @readonly
   */
  public get selectedAccountProblem() {
    return this._selectedAccountProblem;
  }

  /**
   * The delivery-flow steps the agent's responsibilities cover, in flow order.
   *
   * @public
   * @readonly
   */
  public get deliveryFlowSteps() {
    return this._deliveryFlowSteps;
  }

  /**
   * The backup account that takes over first, with its effort card, for the preview.
   *
   * @public
   * @readonly
   */
  public get previewFallback() {
    return this._previewFallback;
  }
  // #endregion
  // #region Methods
  /** Hydrates this feature-owned sheet from the authoritative configuration. @public */
  public override async onHydrate(): Promise<void> {
    try {
      if (!this.store.settings()) await this.hydrateConfiguration();
      void this.onExecuteRefreshAiConfigurationCommand().finally(() =>
        this._changeDetector.detectChanges(),
      );
    } finally {
      window.requestAnimationFrame(() => this._application.tick());
    }
  }
  /**
   * Returns the selected AI account.
   *
   * @private
   */
  private resolveSelectedAiAccount(): AiConnection | undefined {
    return this.resolveAiAccounts().find((account) => account.id === this.ai.accountId);
  }

  /**
   * Returns why the selected account cannot run the agent.
   *
   * @private
   */
  private resolveSelectedAccountProblem(): 'cli-missing' | 'not-signed-in' | undefined {
    const account = this.resolveSelectedAiAccount();
    if (!account) return undefined;
    if (!this.resolveAiRuntimeAvailable(account.kind)) return 'cli-missing';
    if (account.kind === 'opencode') return undefined;
    const provider =
      account.kind === 'codex' ? this.store.connections()?.codex : this.store.connections()?.claude;
    const status = provider?.accounts.find((candidate) => candidate.id === account.id);
    return status && !status.authenticated ? 'not-signed-in' : undefined;
  }

  /**
   * Returns the delivery-flow steps covered by the chosen responsibilities.
   *
   * @private
   */
  private resolveDeliveryFlowSteps(): readonly IDeliveryFlowStep[] {
    return deliveryFlowSteps.filter((step) =>
      step.skillFlowRoles.some((role) => this.ai.roles.includes(role)),
    );
  }

  /**
   * Returns the first enabled backup account with its effort card.
   *
   * @private
   */
  private resolvePreviewFallback():
    { readonly account: AiConnection; readonly effort: IAiChoice | undefined } | undefined {
    const accountId = this.ai.fallbackConnectionIds[0];
    const account = this.resolveAiAccounts().find((candidate) => candidate.id === accountId);
    if (!account) return undefined;
    const effortId = this.ai.fallbackEfforts[account.id];
    return {
      account,
      effort: this.resolveFallbackEffortChoices().find((choice) => choice.id === effortId),
    };
  }

  private async onExecuteSaveCommand(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.saveAiAgent();
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
  private resolveCanSave(): boolean {
    return this.resolveAiValidationIssues().length === 0;
  }

  /**
   * Returns the AI validation issues.
   *
   * @private
   */
  private resolveAiValidationIssues(): readonly AiValidationIssue[] {
    if (this.kind !== 'ai') return [];
    return [
      ...(!this.ai.displayName.trim() ? (['agent-name'] as const) : []),
      ...(!this.ai.positionName.trim() ? (['position'] as const) : []),
      ...(!this.ai.roles.length ? (['responsibility'] as const) : []),
      ...(!this.ai.accountId ? (['account'] as const) : []),
      ...(this.ai.accountId && !this.resolveAiRuntimeAvailable(this.ai.kind)
        ? [aiRuntimeValidationIssue(this.ai.kind)]
        : []),
      ...(this.ai.kind === 'opencode' && !this.ai.model.trim() ? (['model'] as const) : []),
    ];
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

  /**
   * Returns the event number.
   *
   * @param event - Event.
   * @private
   */
  private resolveEventNumber(event: unknown): number {
    const value = Number(mosaikEventValue(event));
    return Number.isFinite(value) ? value : 0;
  }

  /**
   * Updates the AI route strategy.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAiRouteStrategyCommand(event: unknown): void {
    const value = this.resolveEventText(event);
    if (
      value === 'priority' ||
      value === 'quality-first' ||
      value === 'last-known-good' ||
      value === 'lowest-cost' ||
      value === 'lowest-latency' ||
      value === 'most-reliable' ||
      value === 'least-used' ||
      value === 'reset-aware' ||
      value === 'balanced'
    ) {
      this.ai.strategy = value;
      this._changeDetector.detectChanges();
    }
  }

  // AI agent wizard - step 1: account, model, effort

  /**
   * Workspace AI accounts (connected services) an agent can run on.
   *
   * @private
   */
  private resolveAiAccounts(): readonly AiConnection[] {
    const data = this.data;
    if (data.kind !== 'ai') return [];
    return this.workspaceAiConnections(data.workspaceId);
  }

  /**
   * Returns the AI fallback accounts.
   *
   * @private
   */
  private resolveAiFallbackAccounts(): readonly AiConnection[] {
    return this.resolveAiAccounts().filter((connection) => connection.id !== this.ai.accountId);
  }

  /**
   * Returns the AI runtime label.
   *
   * @param kind - Kind.
   * @private
   */
  private resolveAiRuntimeLabel(kind: string): string {
    return kind === 'codex' || kind === 'claude' || kind === 'opencode'
      ? AI_RUNTIME_LABELS[kind]
      : kind;
  }

  /**
   * Updates the AI account.
   *
   * @param event - Event.
   * @private
   */
  private async onExecuteUpdateAiAccountCommand(event: unknown): Promise<void> {
    const accountId = this.resolveEventText(event);
    const account = this.resolveAiAccounts().find((candidate) => candidate.id === accountId);
    if (!account || account.id === this.ai.accountId) return;
    this.ai.accountId = account.id;
    this.ai.kind = account.kind;
    const configuredCandidate = this.store
      .settings()
      ?.agentRoutePolicies.flatMap((policy) => policy.candidates)
      .find((candidate) => candidate.aiConnectionId === account.id);
    this.ai.model = configuredCandidate?.model ?? '';
    this.ai.reasoningEffort = configuredCandidate?.reasoningEffort ?? '';
    this.ai.fallbackConnectionIds = this.ai.fallbackConnectionIds.filter(
      (candidate) => candidate !== account.id,
    );
    this.aiConnectionId.set(account.id);
    this.aiModelSearch.set('');
    this._changeDetector.detectChanges();
    await this.onExecuteRefreshAiConfigurationCommand();
    this._changeDetector.detectChanges();
  }

  /**
   * Closes the wizard and asks the settings page to open the AI-account editor instead.
   *
   * @private
   */
  private onExecuteOpenAiAccountEditorCommand(): void {
    const data = this.data;
    if (data.kind !== 'ai') return;
    this._dialogRef.close({
      reason: 'positive',
      result: { next: { kind: 'ai-account', workspaceId: data.workspaceId } },
    });
  }

  /**
   * Model cards for the selected account; codex/opencode come from the CLI, Claude is static.
   *
   * @private
   */
  private resolveAiModelChoices(): readonly IAiChoice[] {
    if (!this.ai.accountId) return [];
    return this.modelChoicesForKind(this.ai.kind);
  }

  /**
   * Returns the selected AI model choice.
   *
   * @private
   */
  private resolveSelectedAiModelChoice(): string {
    return this.ai.kind === 'codex' ? this.selectedAiModelId() : this.ai.model;
  }

  /**
   * Updates the AI model choice.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAiModelChoiceCommand(event: unknown): void {
    const modelId = this.resolveEventText(event);
    if (this.ai.kind === 'codex') {
      this.updateAiModel(modelId);
      return;
    }
    if (!this.resolveAiModelChoices().some((choice) => choice.id === modelId)) return;
    if (modelId === this.ai.model) return;
    this.ai.model = modelId;
    this._changeDetector.detectChanges();
  }

  /**
   * Effort cards; codex reports them per model, Claude Code and OpenCode use the documented ladder.
   *
   * @private
   */
  private resolveAiEffortChoices(): readonly IAiChoice[] {
    if (!this.ai.accountId) return [];
    if (this.ai.kind === 'codex') {
      return this.aiReasoningEfforts().map((effort) => ({
        id: effort.id,
        label: this._settingNamePipe.transform(effort.id),
        ...(effort.description ? { description: effort.description } : {}),
      }));
    }
    return STATIC_EFFORT_CHOICES;
  }

  /**
   * Returns the selected AI effort choice.
   *
   * @private
   */
  private resolveSelectedAiEffortChoice(): string {
    return this.ai.kind === 'codex' ? this.selectedAiReasoningEffort() : this.ai.reasoningEffort;
  }

  /**
   * Updates the AI effort choice.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAiEffortChoiceCommand(event: unknown): void {
    const effort = this.resolveEventText(event);
    if (this.ai.kind === 'codex') {
      this.updateAiReasoningEffort(effort);
      return;
    }
    if (!this.resolveAiEffortChoices().some((choice) => choice.id === effort)) return;
    if (effort === this.ai.reasoningEffort) return;
    this.ai.reasoningEffort = effort;
    this._changeDetector.detectChanges();
  }

  /**
   * OpenCode groups models by provider; the row is only useful with more than one provider.
   *
   * @private
   */
  private resolveOpenCodeProviderChoices(): readonly {
    readonly id: string;
    readonly label: string;
  }[] {
    if (this.ai.kind !== 'opencode') return [];
    const providers = this._openCodeProvidersPipe.transform(this.currentAiModels(), '');
    return providers.length > 1 ? providers : [];
  }

  /**
   * Long OpenCode catalogs get a filter box; short lists stay a plain card grid.
   *
   * @private
   */
  private resolveAiModelSearchVisible(): boolean {
    return this.ai.kind === 'opencode' && this.currentAiModels().length > 12;
  }

  /**
   * Returns the AI models pending.
   *
   * @private
   */
  private resolveAiModelsPending(): boolean {
    if (!this.ai.accountId || this.resolveAiModelChoices().length) return false;
    return this.ai.kind === 'codex' || this.ai.kind === 'opencode';
  }

  /**
   * Returns the AI fallback enabled.
   *
   * @param connectionId - Connection id.
   * @private
   */
  private resolveAiFallbackEnabled(connectionId: string): boolean {
    return this.ai.fallbackConnectionIds.includes(connectionId);
  }

  /**
   * Sets the AI fallback.
   *
   * @param connectionId - Connection id.
   * @param enabled - Enabled.
   * @private
   */
  private onExecuteSetAiFallbackCommand(connectionId: string, enabled: boolean): void {
    this.ai.fallbackConnectionIds = enabled
      ? [...new Set([...this.ai.fallbackConnectionIds, connectionId])]
      : this.ai.fallbackConnectionIds.filter((candidate) => candidate !== connectionId);
    if (!enabled) {
      const { [connectionId]: removedModel, ...models } = this.ai.fallbackModels;
      const { [connectionId]: removedEffort, ...efforts } = this.ai.fallbackEfforts;
      void removedModel;
      void removedEffort;
      this.ai.fallbackModels = models;
      this.ai.fallbackEfforts = efforts;
    }
    if (enabled) void this.onExecuteRefreshAiConfigurationCommand(connectionId);
    this._changeDetector.detectChanges();
  }

  /**
   * Model cards for a backup account; its own runtime decides the list, not the primary one.
   *
   * @param connection - Connection.
   * @private
   */
  private resolveFallbackModelChoices(connection: AiConnection): readonly IAiChoice[] {
    return this.modelChoicesFor(connection);
  }

  /**
   * Returns the fallback effort choices.
   *
   * @private
   */
  private resolveFallbackEffortChoices(): readonly IAiChoice[] {
    return STATIC_EFFORT_CHOICES;
  }

  /**
   * Returns the fallback model.
   *
   * @param connectionId - Connection id.
   * @private
   */
  private resolveFallbackModel(connectionId: string): string {
    return this.ai.fallbackModels[connectionId] ?? '';
  }

  /**
   * Returns the fallback effort.
   *
   * @param connectionId - Connection id.
   * @private
   */
  private resolveFallbackEffort(connectionId: string): string {
    return this.ai.fallbackEfforts[connectionId] ?? '';
  }

  /**
   * Accepts the choice id directly from a click and the value from the group's change event.
   *
   * @param connectionId - Connection id.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateFallbackModelCommand(connectionId: string, event: unknown): void {
    const modelId = typeof event === 'string' ? event : this.resolveEventText(event);
    if (!modelId) return;
    this.ai.fallbackModels = { ...this.ai.fallbackModels, [connectionId]: modelId };
    this._changeDetector.detectChanges();
  }

  /**
   * Updates the fallback effort.
   *
   * @param connectionId - Connection id.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateFallbackEffortCommand(connectionId: string, event: unknown): void {
    const effortId = typeof event === 'string' ? event : this.resolveEventText(event);
    if (!effortId) return;
    this.ai.fallbackEfforts = { ...this.ai.fallbackEfforts, [connectionId]: effortId };
    this._changeDetector.detectChanges();
  }

  /**
   * Returns the AI role enabled.
   *
   * @param role - Role.
   * @private
   */
  private resolveAiRoleEnabled(role: SkillFlowRole): boolean {
    return this.ai.roles.includes(role);
  }

  /**
   * Sets the AI role.
   *
   * @param role - Role.
   * @param enabled - Enabled.
   * @private
   */
  private onExecuteSetAiRoleCommand(role: SkillFlowRole, enabled: boolean): void {
    this.ai.roles = enabled
      ? [...new Set([...this.ai.roles, role])]
      : this.ai.roles.filter((candidate) => candidate !== role);
    this._changeDetector.detectChanges();
  }

  /**
   * Returns the selected AI provider ID.
   *
   * @private
   */
  private resolveSelectedAiProviderId(): string {
    const selectedModel = this.currentAiModels().find((model) => model.id === this.ai.model);
    return selectedModel?.providerId ?? this.currentAiModels()[0]?.providerId ?? '';
  }

  /**
   * Updates the open code provider.
   *
   * @param providerId - Provider id.
   * @private
   */
  private onExecuteUpdateOpenCodeProviderCommand(providerId: string): void {
    const model = this.currentAiModels().find((candidate) => candidate.providerId === providerId);
    if (!model) return;
    this.ai.model = model.id;
    this.aiModelSearch.set('');
    this._changeDetector.detectChanges();
  }

  /**
   * Refreshes the available AI models.
   *
   * @private
   */
  private async refreshAvailableAiModels(): Promise<void> {
    const data = this.data;
    if (
      data.kind !== 'ai' ||
      this.ai.kind !== 'opencode' ||
      !this.ai.accountId ||
      !this.resolveAiRuntimeAvailable('opencode')
    ) {
      return;
    }
    const loaded = await this.store.refreshAvailableAiModels({
      runtime: 'opencode',
      workspaceId: data.workspaceId,
      connectionId: this.ai.accountId,
    });
    if (loaded && !this.ai.model.trim()) {
      this.ai.model = this.currentAiModels()[0]?.id ?? '';
    }
    this._changeDetector.detectChanges();
  }

  /**
   * Returns the AI model scope ID.
   *
   * @private
   */
  private aiModelScopeId(): string {
    return this.data.kind === 'ai' ? this.ai.accountId : '';
  }

  /**
   * Returns the current AI models.
   *
   * @private
   */
  private currentAiModels() {
    return this.store.availableAiModels()?.scopeId === this.aiModelScopeId()
      ? (this.store.availableAiModels()?.models ?? [])
      : [];
  }

  /**
   * Returns the AI models.
   *
   * @private
   */
  private aiModels(): readonly AiModelOption[] {
    if (
      this.data.kind !== 'ai' ||
      this.ai.kind !== 'codex' ||
      !this.aiConnectionId() ||
      this.store.codexConfigurationAccountId() !== this.aiConnectionId()
    ) {
      return [];
    }
    return this.store.codexConfiguration()?.models ?? [];
  }

  /**
   * Returns the selected AI model.
   *
   * @private
   */
  private selectedAiModel(): AiModelOption | undefined {
    const models = this.aiModels();
    return (
      models.find((model) => model.id === this.ai.model) ??
      models.find((model) => model.isDefault) ??
      models[0]
    );
  }

  /**
   * Returns the selected AI model ID.
   *
   * @private
   */
  private selectedAiModelId(): string {
    return this.selectedAiModel()?.id ?? '';
  }

  /**
   * Returns the AI reasoning efforts.
   *
   * @private
   */
  private aiReasoningEfforts(): readonly { readonly id: string; readonly description: string }[] {
    return this.selectedAiModel()?.reasoningEfforts ?? [];
  }

  /**
   * Returns the selected AI reasoning effort.
   *
   * @private
   */
  private selectedAiReasoningEffort(): string {
    const model = this.selectedAiModel();
    if (!model) return '';
    return model.reasoningEfforts.some((effort) => effort.id === this.ai.reasoningEffort)
      ? this.ai.reasoningEffort
      : model.defaultReasoningEffort;
  }

  /**
   * Updates the AI model.
   *
   * @param event - Event.
   * @private
   */
  private updateAiModel(event: unknown): void {
    const modelId = this.resolveEventText(event);
    const model = this.aiModels().find((candidate) => candidate.id === modelId);
    if (!model) return;
    if (model.id === this.ai.model) return;
    const currentEffort = this.ai.reasoningEffort;
    this.ai.model = model.id;
    this.ai.reasoningEffort = model.reasoningEfforts.some((effort) => effort.id === currentEffort)
      ? currentEffort
      : model.defaultReasoningEffort;
    this._changeDetector.detectChanges();
  }

  /**
   * Updates the AI reasoning effort.
   *
   * @param event - Event.
   * @private
   */
  private updateAiReasoningEffort(event: unknown): void {
    const effort = this.resolveEventText(event);
    if (!this.aiReasoningEfforts().some((candidate) => candidate.id === effort)) return;
    if (effort === this.ai.reasoningEffort) return;
    this.ai.reasoningEffort = effort;
    this._changeDetector.detectChanges();
  }

  // AI runtimes (CLIs) - shared by both AI drawers

  /**
   * Returns the AI runtime available.
   *
   * @param runtime - Runtime.
   * @private
   */
  private resolveAiRuntimeAvailable(runtime: Connection['kind']): boolean {
    if (runtime !== 'codex' && runtime !== 'claude' && runtime !== 'opencode') return false;
    return this.store.runtimeHealth()?.agents[runtime].available === true;
  }

  /**
   * Confirms the install AI runtime.
   *
   * @param runtime - Runtime.
   * @param label - Label.
   * @private
   */
  private onExecuteConfirmInstallAiRuntimeCommand(
    runtime: Connection['kind'],
    label: string,
  ): void {
    if (!this.store.nativeInstallAvailable) return;
    if (runtime !== 'codex' && runtime !== 'claude' && runtime !== 'opencode') return;
    if (
      this.resolveAiRuntimeAvailable(runtime) ||
      !this.store.runtimeHealth()?.homebrew.available ||
      this.store.runtimeDependencyInstallBusy()
    ) {
      return;
    }
    void this._alerts
      .confirm({
        id: `install-agent-runtime-${runtime}`,
        header: `Install ${label} CLI?`,
        message: `Homebrew will download and install ${label} CLI on this Mac. Symphony verifies the command before enabling it for agents.`,
        tone: 'warning',
        confirmLabel: 'Install with Homebrew',
        cancelLabel: 'Cancel',
      })
      .then((confirmed) => {
        if (confirmed) void this.installAiRuntime(runtime);
      });
  }

  /**
   * Refreshes the AI configuration.
   *
   * @param connectionId - Connection id.
   * @private
   */
  private async onExecuteRefreshAiConfigurationCommand(connectionId?: string): Promise<void> {
    const data = this.data;
    if (data.kind !== 'ai') return;
    const accountId = connectionId ?? this.ai.accountId;
    const configuredConnection = accountId
      ? this.store.settings()?.connections.find((item) => item.id === accountId)
      : undefined;
    if (configuredConnection?.kind === 'codex' || configuredConnection?.kind === 'claude') {
      this.aiConnectionId.set(configuredConnection.id);
      await this.store.refreshProviderConnections();
    }
    if (this.ai.kind === 'codex' && configuredConnection?.kind === 'codex') {
      await this.store.refreshCodexConfiguration(configuredConnection.id);
      return;
    }
    if (this.ai.kind === 'opencode') {
      await this.refreshAvailableAiModels();
    }
    this.store.clearCodexConfiguration();
  }

  /** Model cards of any account, so a backup route can be configured like the primary one. */
  private modelChoicesFor(connection: AiConnection): readonly IAiChoice[] {
    return this.modelChoicesForKind(connection.kind);
  }

  private modelChoicesForKind(kind: AiRuntimeKind): readonly IAiChoice[] {
    switch (kind) {
      case 'codex':
        return this.aiModels().map((model) => ({ id: model.id, label: model.displayName }));
      case 'claude':
        return CLAUDE_MODEL_CHOICES;
      case 'opencode': {
        // With a single provider the "provider/" prefix carries no information; drop it.
        const singleProvider = this.resolveOpenCodeProviderChoices().length === 0;
        return this._openCodeModelsPipe
          .transform(
            this.currentAiModels(),
            this.resolveSelectedAiProviderId(),
            this.aiModelSearch(),
          )
          .map((model) => ({
            id: model.id,
            label: this._settingNamePipe.transform(
              singleProvider ? model.displayName.replace(/^[^/]+\//u, '') : model.displayName,
            ),
          }));
      }
      default:
        return [];
    }
  }
  private async installAiRuntime(runtime: AiRuntimeKind): Promise<void> {
    if (!(await this.store.installRuntimeDependency(runtime))) return;
    await this.store.refreshProviderConnections();
    if (runtime === this.ai.kind) await this.onExecuteRefreshAiConfigurationCommand();
    this._changeDetector.detectChanges();
  }

  private workspaceAiConnections(workspaceId: string): readonly AiConnection[] {
    return (this.store.settings()?.connections ?? []).filter(
      (connection): connection is AiConnection =>
        connection.workspaceId === workspaceId &&
        (connection.kind === 'codex' ||
          connection.kind === 'claude' ||
          connection.kind === 'opencode'),
    );
  }
  private async hydrateConfiguration(): Promise<void> {
    await this.store.refreshConfiguration();
    this.ai = this.createAiDraft();
  }

  private async saveAiAgent(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'ai' || this.resolveAiValidationIssues().length) return;
    const current = this.requireSettings();
    const existingProfile = current.agentProfiles.find(
      (item) => item.id === this.ai.profileId && item.workspaceId === data.workspaceId,
    );
    const legacyConnection = data.connectionId
      ? current.connections.find((item) => item.id === data.connectionId)
      : undefined;
    const existingRoutePolicy =
      current.agentRoutePolicies.find((policy) => policy.id === existingProfile?.routePolicyId) ??
      (legacyConnection
        ? current.agentRoutePolicies.find(
            (policy) =>
              policy.workspaceId === data.workspaceId &&
              policy.candidates.some(
                (candidate) => candidate.aiConnectionId === legacyConnection.id,
              ),
          )
        : undefined);
    const connection = current.connections.find(
      (item): item is AiConnection =>
        item.id === this.ai.accountId &&
        item.workspaceId === data.workspaceId &&
        (item.kind === 'codex' || item.kind === 'claude' || item.kind === 'opencode'),
    );
    if (!connection) return;
    const connectionId = connection.id;
    const existingRouteCandidate =
      existingRoutePolicy?.candidates.find(
        (candidate) => candidate.aiConnectionId === connectionId,
      ) ??
      existingRoutePolicy?.candidates
        .filter((candidate) => candidate.enabled)
        .sort((left, right) => left.priority - right.priority)[0];
    const existingPosition = existingProfile
      ? current.positions.find((position) => position.id === existingProfile.positionId)
      : undefined;
    const model = this.ai.kind === 'codex' ? this.selectedAiModelId() : this.ai.model.trim();
    const reasoningEffort =
      this.ai.kind === 'codex' ? this.selectedAiReasoningEffort() : this.ai.reasoningEffort.trim();
    const costClass: RouteCostClass =
      existingRouteCandidate?.aiConnectionId === connectionId
        ? existingRouteCandidate.costClass
        : this.deriveCostClass(connection);
    const fallbackCostClasses = this.ai.fallbackConnectionIds.flatMap((fallbackConnectionId) => {
      const candidate = current.agentRoutePolicies
        .flatMap((policy) => policy.candidates)
        .find((item) => item.aiConnectionId === fallbackConnectionId);
      return candidate ? [candidate.costClass] : [];
    });
    const position: Settings['positions'][number] = existingPosition
      ? {
          ...existingPosition,
          displayName: this.ai.positionName.trim(),
          description: this.ai.positionDescription.trim(),
          responsibilities: this.ai.roles,
          allowedRoles: this.ai.roles,
          requiredCapabilities: ['coding', 'reasoning', 'tool-calling'],
          allowedPathPatterns: splitList(this.ai.allowedPathPatterns),
          forbiddenPathPatterns: splitList(this.ai.forbiddenPathPatterns),
          maximumChangedFiles: Math.max(0, Math.floor(this.ai.maximumChangedFiles)),
          maximumDiffLines: Math.max(0, Math.floor(this.ai.maximumDiffLines)),
          maximumIterations: Math.max(1, Math.floor(this.ai.maximumIterations)),
        }
      : {
          id: `position-${crypto.randomUUID()}`,
          workspaceId: data.workspaceId,
          displayName: this.ai.positionName.trim(),
          description: this.ai.positionDescription.trim(),
          responsibilities: this.ai.roles,
          allowedRoles: this.ai.roles,
          authority: 'worktree-write',
          requiredCapabilities: ['coding', 'reasoning', 'tool-calling'],
          allowedPathPatterns: splitList(this.ai.allowedPathPatterns),
          forbiddenPathPatterns: splitList(this.ai.forbiddenPathPatterns),
          maximumChangedFiles: Math.max(0, Math.floor(this.ai.maximumChangedFiles)),
          maximumDiffLines: Math.max(0, Math.floor(this.ai.maximumDiffLines)),
          maximumIterations: Math.max(1, Math.floor(this.ai.maximumIterations)),
        };
    const routePolicy: Settings['agentRoutePolicies'][number] = {
      id: existingRoutePolicy?.id ?? `route-${crypto.randomUUID()}`,
      workspaceId: data.workspaceId,
      displayName: `${this.ai.displayName.trim()} route`,
      strategy: this.ai.strategy,
      costPolicy:
        costClass === 'local' && fallbackCostClasses.every((cost) => cost === 'local')
          ? 'local-only'
          : costClass === 'free-tier' && fallbackCostClasses.every((cost) => cost === 'free-tier')
            ? 'free-only'
            : 'any',
      sessionAffinity: this.ai.sessionAffinity,
      maxParallelExecutions: Math.max(1, Math.floor(this.ai.maxParallelExecutions)),
      candidates: [
        {
          id: existingRouteCandidate?.id ?? `route-candidate-${crypto.randomUUID()}`,
          aiConnectionId: connectionId,
          model: model || null,
          reasoningEffort: reasoningEffort || null,
          costClass,
          providerId:
            connection.kind === 'opencode' && connection.gateway
              ? connection.gateway.providerId
              : connection.kind,
          capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'],
          qualityScore: Math.max(0, Math.min(100, Math.floor(this.ai.qualityScore))),
          contextWindow: null,
          ...(costClass === 'free-tier' && existingRouteCandidate?.freeTierEvidence
            ? { freeTierEvidence: existingRouteCandidate.freeTierEvidence }
            : {}),
          priority: 0,
          enabled: true,
        },
        ...this.ai.fallbackConnectionIds.flatMap((fallbackConnectionId, index) => {
          const fallbackConnection = current.connections.find(
            (candidate) => candidate.id === fallbackConnectionId,
          );
          if (
            !fallbackConnection ||
            fallbackConnection.workspaceId !== data.workspaceId ||
            (fallbackConnection.kind !== 'codex' &&
              fallbackConnection.kind !== 'claude' &&
              fallbackConnection.kind !== 'opencode')
          ) {
            return [];
          }
          const configuredCandidate = current.agentRoutePolicies
            .flatMap((policy) => policy.candidates)
            .find((candidate) => candidate.aiConnectionId === fallbackConnectionId);
          return [
            {
              id: configuredCandidate?.id ?? `route-candidate-${crypto.randomUUID()}`,
              aiConnectionId: fallbackConnectionId,
              model: this.ai.fallbackModels[fallbackConnectionId] || null,
              reasoningEffort: this.ai.fallbackEfforts[fallbackConnectionId] || null,
              costClass: configuredCandidate?.costClass ?? this.deriveCostClass(fallbackConnection),
              providerId: configuredCandidate?.providerId ?? fallbackConnection.kind,
              capabilities: configuredCandidate?.capabilities ?? [
                'coding' as const,
                'reasoning' as const,
                'tool-calling' as const,
              ],
              qualityScore: configuredCandidate?.qualityScore ?? 50,
              contextWindow: configuredCandidate?.contextWindow ?? null,
              ...(configuredCandidate?.freeTierEvidence
                ? { freeTierEvidence: configuredCandidate.freeTierEvidence }
                : {}),
              priority: index + 1,
              enabled: true,
            },
          ];
        }),
      ],
    };
    const profile: Settings['agentProfiles'][number] = {
      id: existingProfile?.id ?? this.ai.profileId,
      workspaceId: data.workspaceId,
      displayName: this.ai.displayName.trim(),
      positionId: position.id,
      routePolicyId: routePolicy.id,
      qualificationTags: [...new Set(this.ai.roles)],
      appearance: this.ai.appearance,
      enabled: existingProfile?.enabled ?? true,
    };
    const routeConnections: readonly AiConnection[] = [
      connection,
      ...this.ai.fallbackConnectionIds.flatMap((fallbackConnectionId) => {
        const candidate = current.connections.find((item) => item.id === fallbackConnectionId);
        return candidate?.kind === 'codex' ||
          candidate?.kind === 'claude' ||
          candidate?.kind === 'opencode'
          ? [candidate]
          : [];
      }),
    ];
    const providerManifests = routeConnections.reduce<Settings['providerManifests']>(
      (manifests, routeConnection) => {
        const providerId =
          routeConnection.kind === 'opencode' && routeConnection.gateway
            ? routeConnection.gateway.providerId
            : routeConnection.kind;
        if (manifests.some((manifest) => manifest.providerId === providerId)) return manifests;
        const existingManifest = current.providerManifests.find(
          (manifest) =>
            manifest.workspaceId === data.workspaceId && manifest.providerId === providerId,
        );
        return [
          ...manifests,
          {
            id:
              existingManifest?.id ??
              `provider-${data.workspaceId}-${providerId}`.replace(/[^a-zA-Z0-9_-]/gu, '-'),
            workspaceId: data.workspaceId,
            providerId,
            displayName:
              routeConnection.kind === 'opencode' && routeConnection.gateway
                ? routeConnection.gateway.displayName
                : AI_RUNTIME_LABELS[routeConnection.kind],
            runtime:
              routeConnection.kind === 'opencode' && routeConnection.gateway
                ? ('openai-compatible-gateway' as const)
                : routeConnection.kind,
            protocol:
              routeConnection.kind === 'opencode' && routeConnection.gateway
                ? ('openai-compatible' as const)
                : ('cli' as const),
            capabilities: ['coding', 'reasoning', 'tool-calling', 'long-context'] as const,
            modelDiscovery:
              routeConnection.kind === 'codex' ||
              (routeConnection.kind === 'opencode' && !routeConnection.gateway)
                ? ('runtime' as const)
                : ('configured' as const),
            officialApi: !(routeConnection.kind === 'opencode' && routeConnection.gateway),
          },
        ];
      },
      [],
    );
    const next = this.synchronizeDeliveryContext(
      {
        ...current,
        positions: upsertSettingsItem(current.positions, position),
        providerManifests: providerManifests.reduce(
          (manifests, manifest) => upsertSettingsItem(manifests, manifest),
          current.providerManifests,
        ),
        agentRoutePolicies: upsertSettingsItem(current.agentRoutePolicies, routePolicy),
        agentProfiles: upsertSettingsItem(current.agentProfiles, profile),
      },
      data.workspaceId,
      profile.id,
      this.ai.roles,
      this.ai.skillIds,
    );
    if (!(await this.store.saveSettings(next))) return;
    this._dialogRef.close();
  }

  /**
   * Usage type is not asked in the wizard any more: it follows from how the account is
   * connected. Free-tier is never derived because it needs recorded evidence and approval.
   */
  private deriveCostClass(connection: AiConnection): RouteCostClass {
    switch (connection.kind) {
      case 'codex': {
        const method = this.store
          .connections()
          ?.codex.accounts.find((account) => account.id === connection.id)?.method;
        return method === 'api-key' || connection.credentialRef ? 'paid' : 'subscription-included';
      }
      case 'claude':
        return connection.credentialRef ? 'paid' : 'subscription-included';
      case 'opencode':
        return connection.gateway || connection.credentialRef ? 'paid' : 'unknown';
      default:
        return 'unknown';
    }
  }
  private synchronizeDeliveryContext(
    settings: Settings,
    workspaceId: string,
    preferredProfileId?: string,
    preferredRoles: readonly SkillFlowRole[] = SKILL_FLOW_ROLES,
    preferredSkillIds: Partial<Record<SkillFlowRole, string>> = {},
  ): Settings {
    return synchronizeWorkspaceTeamConfiguration(
      settings,
      workspaceId,
      preferredProfileId,
      preferredRoles,
      preferredSkillIds,
    );
  }

  /**
   * Creates a computed projection that also follows mutable drawer draft changes.
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
  private createTrackedDraft<TDraft extends object>(draft: TDraft): TDraft {
    return createTrackedSettingsDraft(draft, () =>
      this._draftRevision.update((revision) => revision + 1),
    );
  }

  private createAiDraft() {
    const settings = this.store.settings();
    const data = this.data;
    const profileFromId =
      data.kind === 'ai' && data.agentProfileId
        ? settings?.agentProfiles.find(
            (profile) =>
              profile.id === data.agentProfileId && profile.workspaceId === data.workspaceId,
          )
        : undefined;
    const routeFromProfile = profileFromId
      ? settings?.agentRoutePolicies.find((policy) => policy.id === profileFromId.routePolicyId)
      : undefined;
    const routeCandidateFromProfile = routeFromProfile?.candidates
      .filter((candidate) => candidate.enabled)
      .sort((left, right) => left.priority - right.priority)[0];
    const connectionId =
      data.kind === 'ai'
        ? (routeCandidateFromProfile?.aiConnectionId ?? data.connectionId)
        : undefined;
    const connection = settings?.connections.find((item) => item.id === connectionId);
    const aiConnection =
      connection?.kind === 'codex' ||
      connection?.kind === 'claude' ||
      connection?.kind === 'opencode'
        ? connection
        : undefined;
    const routePolicy =
      routeFromProfile ??
      (aiConnection
        ? settings?.agentRoutePolicies.find((policy) =>
            policy.candidates.some((candidate) => candidate.aiConnectionId === aiConnection.id),
          )
        : undefined);
    const existingProfile =
      profileFromId ??
      (routePolicy
        ? settings?.agentProfiles.find((profile) => profile.routePolicyId === routePolicy.id)
        : undefined);
    const routeCandidate =
      routeCandidateFromProfile ??
      routePolicy?.candidates.find((candidate) => candidate.aiConnectionId === aiConnection?.id);
    const existingPosition = existingProfile
      ? settings?.positions.find((position) => position.id === existingProfile.positionId)
      : undefined;
    const workspaceAccounts =
      data.kind === 'ai' ? this.workspaceAiConnections(data.workspaceId) : [];
    // A new agent starts on the only account when there is exactly one; otherwise the user picks.
    const selectedAccount =
      aiConnection ?? (workspaceAccounts.length === 1 ? workspaceAccounts[0] : undefined);
    const selectedRouteCandidate =
      routeCandidate ??
      settings?.agentRoutePolicies
        .flatMap((policy) => policy.candidates)
        .find((candidate) => candidate.aiConnectionId === selectedAccount?.id);
    const team =
      data.kind === 'ai'
        ? settings?.agentTeams.find((candidate) => candidate.workspaceId === data.workspaceId)
        : undefined;
    const skillIds = Object.fromEntries(
      (team?.assignments ?? [])
        .filter(
          (assignment) => assignment.primaryAgentId === existingProfile?.id && assignment.skillId,
        )
        .map((assignment) => [assignment.role, assignment.skillId]),
    ) as Partial<Record<SkillFlowRole, string>>;
    const profileId = existingProfile?.id ?? `agent-${crypto.randomUUID()}`;
    return this.createTrackedDraft({
      profileId,
      appearance: existingProfile?.appearance ?? defaultAgentAppearance(profileId),
      accountId: selectedAccount?.id ?? '',
      kind: selectedAccount?.kind ?? ('codex' as AiRuntimeKind),
      displayName: existingProfile?.displayName ?? '',
      positionName: existingPosition?.displayName ?? '',
      positionDescription: existingPosition?.description ?? '',
      model: selectedRouteCandidate?.model ?? '',
      reasoningEffort: selectedRouteCandidate?.reasoningEffort ?? '',
      strategy: routePolicy?.strategy ?? ('balanced' as const),
      sessionAffinity: routePolicy?.sessionAffinity ?? true,
      maxParallelExecutions: routePolicy?.maxParallelExecutions ?? 1,
      qualityScore: selectedRouteCandidate?.qualityScore ?? 50,
      fallbackConnectionIds:
        routePolicy?.candidates
          .filter((candidate) => candidate.aiConnectionId !== aiConnection?.id)
          .map((candidate) => candidate.aiConnectionId) ?? [],
      fallbackModels: Object.fromEntries(
        (routePolicy?.candidates ?? [])
          .filter((candidate) => candidate.aiConnectionId !== aiConnection?.id && candidate.model)
          .map((candidate) => [candidate.aiConnectionId, candidate.model!]),
      ) as Record<string, string>,
      fallbackEfforts: Object.fromEntries(
        (routePolicy?.candidates ?? [])
          .filter(
            (candidate) =>
              candidate.aiConnectionId !== aiConnection?.id && candidate.reasoningEffort,
          )
          .map((candidate) => [candidate.aiConnectionId, candidate.reasoningEffort!]),
      ) as Record<string, string>,
      allowedPathPatterns: (existingPosition?.allowedPathPatterns ?? ['**']).join(', '),
      forbiddenPathPatterns: (
        existingPosition?.forbiddenPathPatterns ?? [
          '.git/**',
          '.env',
          '.env.*',
          '**/credentials/**',
        ]
      ).join(', '),
      maximumChangedFiles: existingPosition?.maximumChangedFiles ?? 100,
      maximumDiffLines: existingPosition?.maximumDiffLines ?? 20_000,
      maximumIterations: existingPosition?.maximumIterations ?? 8,
      roles: [...(existingPosition?.allowedRoles ?? [])],
      skillIds,
    });
  }

  private initialAiConnectionId(): string | undefined {
    const data = this.data;
    if (data.kind !== 'ai') return undefined;
    if (data.connectionId) return data.connectionId;
    const settings = this.store.settings();
    const profile = settings?.agentProfiles.find(
      (candidate) => candidate.id === data.agentProfileId,
    );
    const route = settings?.agentRoutePolicies.find(
      (candidate) => candidate.id === profile?.routePolicyId,
    );
    const routedAccountId = route?.candidates
      .filter((candidate) => candidate.enabled)
      .sort((left, right) => left.priority - right.priority)[0]?.aiConnectionId;
    if (routedAccountId) return routedAccountId;
    const workspaceAccounts = this.workspaceAiConnections(data.workspaceId);
    return workspaceAccounts.length === 1 ? workspaceAccounts[0]?.id : undefined;
  }

  private requireSettings(): Settings {
    const settings = this.store.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  // #endregion
}
