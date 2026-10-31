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
import {
  createTrackedSettingsDraft,
  upsertSettingsItem,
  mosaikEventValue,
} from '@symphony/frontend-setting';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  MessageBoxService,
} from '@pixel-brewery/mosaik-elements-angular';
import { aiAccountRemovalBlockers, withoutAiAccount } from './ai-account-removal';
import { aiRuntimeValidationIssue, AI_RUNTIME_LABELS } from '@symphony/frontend-ui';
import { type AiAccountValidationIssue } from '../models/AiAccountValidationIssue';
import { type AiConnection, type AiRuntimeKind } from '@symphony/frontend-core/ai';
import { type ApplicationSettingsDto as Settings } from '@symphony/ipc-contracts-composition';
import { type IAiAccountSettingsEditorRequest } from './IAiAccountSettingsEditorRequest';
import { AiStore } from '../state/AiStore';

// #endregion

type Connection = Settings['connections'][number];

/** Feature-owned account form lifecycle and commands. @public */
@Injectable()
export class AiAccountSettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  /** The actual AI state and consumed settings operations. @public @readonly */ public readonly store =
    inject(AiStore);
  /** Validated feature-owned drawer request. @public @readonly */ public readonly data =
    inject<IAiAccountSettingsEditorRequest>(DRAWER_REF_DATA);

  /**
   * The kind.
   *
   * @public
   * @readonly
   */
  public readonly kind = this.data.kind;

  private readonly _application = inject(ApplicationRef);

  private readonly _changeDetector = inject(ChangeDetectorRef);

  private readonly _messageBoxService = inject(MessageBoxService);
  private readonly _drawerRef = inject(DRAWER_REF);

  private readonly _draftRevision = signal(0);

  /**
   * The busy.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);

  /**
   * The claude login pending.
   *
   * @public
   * @readonly
   */
  public readonly claudeLoginPending = signal(false);

  /**
   * Persisted id of the AI account edited in the `ai-account` drawer; set once it is saved.
   *
   * @public
   * @readonly
   */
  public readonly aiAccountId = signal(
    this.data.kind === 'ai-account' ? this.data.connectionId : undefined,
  );

  /**
   * The AI account.
   *
   * @public
   */
  public aiAccount = this.createAiAccountDraft();

  /** True while this drawer created the account and no sign-in has completed for it yet. */
  private _aiAccountProvisional = false;

  /**
   * OpenCode has no sign-in status; remember a successful import for this drawer session.
   *
   * @public
   * @readonly
   */
  public readonly aiAccountConnected = signal(false);

  private _aiAccountStatusPoll?: number;

  /** Sign-in step currently in flight; closing the drawer waits for it before deciding rollback. */
  private _aiAccountOperation?: Promise<void>;

  /**
   * The AI runtimes.
   *
   * @public
   * @readonly
   */
  public readonly aiRuntimes: readonly AiRuntimeKind[] = ['codex', 'claude', 'opencode'];

  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(),
  );

  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );

  private readonly _canSave = this.createDraftProjection(() => this.resolveCanSave());

  private readonly _aiAccountValidationIssues = this.createDraftProjection(() =>
    this.resolveAiAccountValidationIssues(),
  );

  private readonly _eventText = computed(() => (event: unknown) => this.resolveEventText(event));

  private readonly _aiRuntimeLabel = computed(
    () => (kind: string) => this.resolveAiRuntimeLabel(kind),
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

  private readonly _hasExistingAiAccount = this.createDraftProjection(() =>
    this.resolveHasExistingAiAccount(),
  );

  private readonly _updateAiAccountProviderCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiAccountProviderCommand(event),
  );

  private readonly _updateAiAccountLoginMethodCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAiAccountLoginMethodCommand(event),
  );

  private readonly _aiAccountAuthenticated = this.createDraftProjection(() =>
    this.resolveAiAccountAuthenticated(),
  );

  private readonly _savesAiAccountDirectly = this.createDraftProjection(() =>
    this.resolveSavesAiAccountDirectly(),
  );

  private readonly _canConnectAiAccount = this.createDraftProjection(() =>
    this.resolveCanConnectAiAccount(),
  );

  private readonly _connectAiAccountCommand: Command<void> = new Command(
    () => void this.onExecuteConnectAiAccountCommand(),
  );

  private readonly _confirmRemoveAiAccountCommand: Command<void> = new Command(
    () => void this.onExecuteConfirmRemoveAiAccountCommand(),
  );

  private readonly _completeClaudeLoginCommand: Command<void> = new Command(
    () => void this.onExecuteCompleteClaudeLoginCommand(),
  );

  private readonly _refreshAiAccountStatusCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshAiAccountStatusCommand(),
  );

  private readonly _disconnectAiAccountCommand: Command<void> = new Command(
    () => void this.onExecuteDisconnectAiAccountCommand(),
  );

  private readonly _confirmImportOpenCodeCredentialsCommand: Command<void> = new Command(
    () => void this.onExecuteConfirmImportOpenCodeCredentialsCommand(),
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
   * The aiAccountValidationIssues projection.
   *
   * @public
   * @readonly
   */
  public get aiAccountValidationIssues() {
    return this._aiAccountValidationIssues;
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
   * The aiRuntimeLabel projection.
   *
   * @public
   * @readonly
   */
  public get aiRuntimeLabel() {
    return this._aiRuntimeLabel;
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
   * The hasExistingAiAccount projection.
   *
   * @public
   * @readonly
   */
  public get hasExistingAiAccount() {
    return this._hasExistingAiAccount;
  }

  /**
   * The updateAiAccountProvider command.
   *
   * @public
   * @readonly
   */
  public get updateAiAccountProviderCommand(): Command<unknown> {
    return this._updateAiAccountProviderCommand;
  }

  /**
   * The updateAiAccountLoginMethod command.
   *
   * @public
   * @readonly
   */
  public get updateAiAccountLoginMethodCommand(): Command<unknown> {
    return this._updateAiAccountLoginMethodCommand;
  }

  /**
   * The aiAccountAuthenticated projection.
   *
   * @public
   * @readonly
   */
  public get aiAccountAuthenticated() {
    return this._aiAccountAuthenticated;
  }

  /**
   * The savesAiAccountDirectly projection.
   *
   * @public
   * @readonly
   */
  public get savesAiAccountDirectly() {
    return this._savesAiAccountDirectly;
  }

  /**
   * The canConnectAiAccount projection.
   *
   * @public
   * @readonly
   */
  public get canConnectAiAccount() {
    return this._canConnectAiAccount;
  }

  /**
   * The connectAiAccount command.
   *
   * @public
   * @readonly
   */
  public get connectAiAccountCommand(): Command<void> {
    return this._connectAiAccountCommand;
  }

  /**
   * The confirmRemoveAiAccount command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveAiAccountCommand(): Command<void> {
    return this._confirmRemoveAiAccountCommand;
  }

  /**
   * The completeClaudeLogin command.
   *
   * @public
   * @readonly
   */
  public get completeClaudeLoginCommand(): Command<void> {
    return this._completeClaudeLoginCommand;
  }

  /**
   * The refreshAiAccountStatus command.
   *
   * @public
   * @readonly
   */
  public get refreshAiAccountStatusCommand(): Command<void> {
    return this._refreshAiAccountStatusCommand;
  }

  /**
   * The disconnectAiAccount command.
   *
   * @public
   * @readonly
   */
  public get disconnectAiAccountCommand(): Command<void> {
    return this._disconnectAiAccountCommand;
  }

  /**
   * The confirmImportOpenCodeCredentials command.
   *
   * @public
   * @readonly
   */
  public get confirmImportOpenCodeCredentialsCommand(): Command<void> {
    return this._confirmImportOpenCodeCredentialsCommand;
  }
  // #endregion
  // #region Methods
  /** Hydrates this feature-owned drawer from the authoritative configuration. @public */
  public override async onHydrate(): Promise<void> {
    try {
      if (!this.store.settings()) await this.hydrateConfiguration();
      this.aiAccount = this.createAiAccountDraft();
      this._drawerRef.closed.subscribe(() => void this.discardProvisionalAiAccount());
      void this.store
        .refreshProviderConnections()
        .finally(() => this._changeDetector.detectChanges());
    } finally {
      window.requestAnimationFrame(() => this._application.tick());
    }
  }
  private async onExecuteSaveCommand(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (await this.saveAiAccountConnection()) this._drawerRef.close();
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
    this._drawerRef.close();
  }
  private resolveCanSave(): boolean {
    return (
      this.resolveSavesAiAccountDirectly() && this.resolveAiAccountValidationIssues().length === 0
    );
  }

  /**
   * Returns the AI account validation issues.
   *
   * @private
   */
  private resolveAiAccountValidationIssues(): readonly AiAccountValidationIssue[] {
    if (this.kind !== 'ai-account') return [];
    return [
      ...(!this.aiAccount.displayName.trim() ? (['account-name'] as const) : []),
      ...(!this.resolveAiRuntimeAvailable(this.aiAccount.kind)
        ? [aiRuntimeValidationIssue(this.aiAccount.kind)]
        : []),
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
    const confirmation = this._messageBoxService.show({
      id: `install-agent-runtime-${runtime}`,
      header: `Install ${label} CLI?`,
      message: `Homebrew will download and install ${label} CLI on this Mac. Symphony verifies the command before enabling it for agents.`,
      buttons: 'yesNo',
      variant: 'warning',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Install with Homebrew', noLabel: 'Cancel' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason !== 'positive') return;
      void this.installAiRuntime(runtime);
    });
  }

  // AI account editor (Connected services)

  /**
   * Whether it has existing AI account.
   *
   * @private
   */
  private resolveHasExistingAiAccount(): boolean {
    return Boolean(this.aiAccountId());
  }

  /**
   * Updates the AI account provider.
   *
   * @param event - Event.
   * @private
   */
  private async onExecuteUpdateAiAccountProviderCommand(event: unknown): Promise<void> {
    const provider = this.resolveEventText(event);
    if (provider !== 'codex' && provider !== 'claude' && provider !== 'opencode') return;
    if (this.resolveHasExistingAiAccount() || !this.resolveAiRuntimeAvailable(provider)) return;
    if (provider === this.aiAccount.kind) return;
    const defaultNames = Object.values(AI_RUNTIME_LABELS).map((label) => `${label} account`);
    if (!this.aiAccount.displayName.trim() || defaultNames.includes(this.aiAccount.displayName)) {
      this.aiAccount.displayName = `${AI_RUNTIME_LABELS[provider]} account`;
    }
    this.aiAccount.kind = provider;
    this.aiAccount.apiKey = '';
    this.aiAccount.authorizationCode = '';
    this.claudeLoginPending.set(false);
    this._changeDetector.detectChanges();
  }

  /**
   * Updates the AI account login method.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAiAccountLoginMethodCommand(event: unknown): void {
    const loginMethod = this.resolveEventText(event);
    if (loginMethod === 'chatgpt' || loginMethod === 'api-key') {
      this.aiAccount.loginMethod = loginMethod;
      this._changeDetector.detectChanges();
    }
  }

  /**
   * Returns the AI account authenticated.
   *
   * @private
   */
  private resolveAiAccountAuthenticated(): boolean {
    const accountId = this.aiAccountId();
    if (!accountId) return false;
    return this.providerAccountAuthenticated(accountId, this.aiAccount.kind);
  }

  /**
   * Returns the claude CLI available.
   *
   * @private
   */
  private claudeCliAvailable(): boolean {
    return this.store.connections()?.claude.cliAvailable === true;
  }

  /**
   * OpenCode needs no sign-in: its free models run straight from the CLI, and imported provider
   * sign-ins are optional. Codex and Claude Code only exist as accounts once their sign-in ran.
   *
   * @private
   */
  private resolveSavesAiAccountDirectly(): boolean {
    return this.resolveHasExistingAiAccount() || this.aiAccount.kind === 'opencode';
  }

  /**
   * Whether it can connect AI account.
   *
   * @private
   */
  private resolveCanConnectAiAccount(): boolean {
    if (this.resolveAiAccountValidationIssues().length) return false;
    if (this.aiAccount.kind === 'codex' && this.aiAccount.loginMethod === 'api-key') {
      return Boolean(this.aiAccount.apiKey.trim());
    }
    if (this.aiAccount.kind === 'claude') return this.claudeCliAvailable();
    return this.aiAccount.kind !== 'opencode';
  }

  /**
   * Persists the account and immediately starts the provider sign-in. An account only survives
   * this drawer when its sign-in completed; a failed or abandoned sign-in removes it again.
   *
   * @private
   */
  private async onExecuteConnectAiAccountCommand(): Promise<void> {
    if (!this.resolveCanConnectAiAccount() || this._aiAccountOperation) return;
    this.busy.set(true);
    const operation = this.runConnectAiAccount();
    this._aiAccountOperation = operation;
    try {
      await operation;
    } finally {
      this._aiAccountOperation = undefined;
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  }

  /**
   * Removes a connected account together with every route candidate that points at it.
   *
   * @private
   */
  private onExecuteConfirmRemoveAiAccountCommand(): void {
    const accountId = this.aiAccountId();
    if (!accountId) return;
    const settings = this.store.settings();
    const blockers = settings ? aiAccountRemovalBlockers(settings, accountId) : [];
    if (blockers.length) {
      this._messageBoxService.show({
        id: `remove-ai-account-blocked-${accountId}`,
        header: 'This account is still in use',
        message: `${blockers.join(', ')} ${blockers.length === 1 ? 'runs' : 'run'} on this account. Move ${blockers.length === 1 ? 'that agent' : 'those agents'} to another AI account first, then remove it.`,
        buttons: 'ok',
        variant: 'warning',
        pressEscapeToClose: true,
      });
      return;
    }
    const confirmation = this._messageBoxService.show({
      id: `remove-ai-account-${accountId}`,
      header: `Remove ${this.aiAccount.displayName.trim() || 'this AI account'}?`,
      message:
        'Symphony signs the account out, deletes its isolated workspace data, and drops it from every backup route. Agents keep running on their other accounts.',
      buttons: 'yesNo',
      variant: 'danger',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Remove account', noLabel: 'Keep account' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason !== 'positive') return;
      void this.removeAiAccount(accountId);
    });
  }

  /**
   * Completes the claude login.
   *
   * @private
   */
  private async onExecuteCompleteClaudeLoginCommand(): Promise<void> {
    const accountId = this.aiAccountId();
    const authorizationCode = this.aiAccount.authorizationCode.trim();
    if (!accountId || this.aiAccount.kind !== 'claude' || !authorizationCode) return;
    if (this._aiAccountOperation) return;
    this.busy.set(true);
    const operation = (async () => {
      if (await this.store.completeClaudeLogin(accountId, authorizationCode)) {
        this.aiAccount.authorizationCode = '';
        this.claudeLoginPending.set(false);
        this._aiAccountProvisional = false;
        this.aiAccountConnected.set(true);
      }
    })();
    this._aiAccountOperation = operation;
    try {
      await operation;
    } finally {
      this._aiAccountOperation = undefined;
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  }

  /**
   * Refreshes the AI account status.
   *
   * @private
   */
  private async onExecuteRefreshAiAccountStatusCommand(): Promise<void> {
    await this.store.refreshProviderConnections();
    this._changeDetector.detectChanges();
  }

  /**
   * Disconnects the AI account.
   *
   * @private
   */
  private async onExecuteDisconnectAiAccountCommand(): Promise<void> {
    const accountId = this.aiAccountId();
    if (!accountId) return;
    if (this.aiAccount.kind === 'codex') await this.store.disconnectCodex(accountId);
    if (this.aiAccount.kind === 'claude') await this.store.disconnectClaude(accountId);
    this.claudeLoginPending.set(false);
    this._changeDetector.detectChanges();
  }

  /**
   * Confirms the import open code credentials.
   *
   * @private
   */
  private onExecuteConfirmImportOpenCodeCredentialsCommand(): void {
    if (this.aiAccount.kind !== 'opencode') return;
    const confirmation = this._messageBoxService.show({
      id: `import-opencode-credentials-${this.aiAccountId() ?? 'new'}`,
      header: 'Import current OpenCode sign-ins?',
      message:
        'Symphony copies the provider sign-ins currently stored by OpenCode on this Mac into this one workspace account. The copy is isolated; later sign-in changes in another workspace do not affect it.',
      buttons: 'yesNo',
      variant: 'warning',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Import into workspace', noLabel: 'Cancel' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason !== 'positive') return;
      void this.importOpenCodeCredentials();
    });
  }
  private async installAiRuntime(runtime: AiRuntimeKind): Promise<void> {
    if (!(await this.store.installRuntimeDependency(runtime))) return;
    await this.store.refreshProviderConnections();
    await this.onExecuteUpdateAiAccountProviderCommand(runtime);
    this._changeDetector.detectChanges();
  }

  private async runConnectAiAccount(): Promise<void> {
    {
      const created = !this.resolveHasExistingAiAccount();
      const accountId = await this.saveAiAccountConnection();
      if (!accountId) return;
      if (created && this.aiAccount.kind !== 'opencode') this._aiAccountProvisional = true;
      let started: boolean;
      if (this.aiAccount.kind === 'codex') {
        if (this.aiAccount.loginMethod === 'api-key') {
          started = await this.store.connectCodex({
            mode: 'api-key',
            accountId,
            apiKey: this.aiAccount.apiKey,
          });
          if (started) {
            this.aiAccount.apiKey = '';
            this.aiAccountConnected.set(true);
          }
        } else {
          started = await this.store.connectCodex({ mode: 'chatgpt', accountId });
          if (started) this.watchAiAccountSignIn();
        }
      } else if (this.aiAccount.kind === 'claude') {
        started = await this.store.connectClaude(accountId);
        if (started) this.claudeLoginPending.set(true);
      } else {
        // OpenCode needs no sign-in; the account is usable as soon as it is saved.
        started = true;
      }
      if (!started) await this.discardProvisionalAiAccountNow();
      else if (this.resolveAiAccountAuthenticated() || this.aiAccountConnected()) {
        this._aiAccountProvisional = false;
      }
    }
  }

  /** Browser sign-ins finish outside the app; poll the CLI status until they do. */
  private watchAiAccountSignIn(): void {
    this.stopWatchingAiAccountSignIn();
    const startedAt = Date.now();
    this._aiAccountStatusPoll = window.setInterval(() => {
      if (Date.now() - startedAt > 10 * 60_000) {
        this.stopWatchingAiAccountSignIn();
        return;
      }
      void this.store.refreshProviderConnections().then(() => {
        if (this.resolveAiAccountAuthenticated()) {
          this._aiAccountProvisional = false;
          this.stopWatchingAiAccountSignIn();
        }
        this._changeDetector.detectChanges();
      });
    }, 3_000);
  }

  private stopWatchingAiAccountSignIn(): void {
    if (this._aiAccountStatusPoll !== undefined) window.clearInterval(this._aiAccountStatusPoll);
    this._aiAccountStatusPoll = undefined;
  }

  /** Removes an account this drawer created when its sign-in never completed. */
  private async discardProvisionalAiAccount(): Promise<void> {
    if (this._aiAccountOperation) await this._aiAccountOperation.catch(() => undefined);
    await this.discardProvisionalAiAccountNow();
  }

  private async discardProvisionalAiAccountNow(): Promise<void> {
    this.stopWatchingAiAccountSignIn();
    const accountId = this.aiAccountId();
    if (!this._aiAccountProvisional || !accountId) return;
    if (this.resolveAiAccountAuthenticated() || this.aiAccountConnected()) {
      this._aiAccountProvisional = false;
      return;
    }
    this._aiAccountProvisional = false;
    this.claudeLoginPending.set(false);
    const current = this.store.settings();
    if (!current) return;
    await this.store.saveSettings(
      { ...current, connections: current.connections.filter((item) => item.id !== accountId) },
      false,
    );
    this.aiAccountId.set(undefined);
    this._changeDetector.detectChanges();
  }

  private async removeAiAccount(accountId: string): Promise<void> {
    this.busy.set(true);
    try {
      if (this.resolveAiAccountAuthenticated()) {
        if (this.aiAccount.kind === 'codex') await this.store.disconnectCodex(accountId);
        if (this.aiAccount.kind === 'claude') await this.store.disconnectClaude(accountId);
      }
      this._aiAccountProvisional = false;
      if (await this.store.saveSettings(withoutAiAccount(this.requireSettings(), accountId))) {
        this._drawerRef.close();
      }
    } finally {
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  }

  /** Optional for OpenCode: copies the provider sign-ins of this Mac into the workspace account. */
  private async importOpenCodeCredentials(): Promise<void> {
    this.busy.set(true);
    try {
      const accountId = await this.saveAiAccountConnection();
      if (!accountId) return;
      if (await this.store.importOpenCodeCredentials(accountId)) this.aiAccountConnected.set(true);
    } finally {
      this.busy.set(false);
      this._changeDetector.detectChanges();
    }
  }

  private providerAccountAuthenticated(accountId: string, kind: AiRuntimeKind): boolean {
    if (kind === 'codex') {
      return (
        this.store.connections()?.codex.accounts.find((account) => account.id === accountId)
          ?.authenticated === true
      );
    }
    if (kind === 'claude') {
      return (
        this.store.connections()?.claude.accounts.find((account) => account.id === accountId)
          ?.authenticated === true
      );
    }
    return false;
  }
  private async hydrateConfiguration(): Promise<void> {
    await this.store.refreshConfiguration();
    this.aiAccount = this.createAiAccountDraft();
  }

  /** Upserts the AI account connection; returns its id, or undefined when saving failed. */
  private async saveAiAccountConnection(): Promise<string | undefined> {
    const data = this.data;
    if (data.kind !== 'ai-account' || this.resolveAiAccountValidationIssues().length)
      return undefined;
    const current = this.requireSettings();
    const existing = current.connections.find(
      (item): item is AiConnection =>
        item.id === this.aiAccountId() &&
        item.workspaceId === data.workspaceId &&
        (item.kind === 'codex' || item.kind === 'claude' || item.kind === 'opencode'),
    );
    const kind = existing?.kind ?? this.aiAccount.kind;
    const connectionId = existing?.id ?? `${kind}-${crypto.randomUUID()}`;
    const base = {
      id: connectionId,
      workspaceId: data.workspaceId,
      displayName: this.aiAccount.displayName.trim(),
      ...(this.aiAccount.credentialRef.trim()
        ? { credentialRef: this.aiAccount.credentialRef.trim() }
        : {}),
    };
    const connection: AiConnection =
      kind === 'opencode'
        ? {
            ...base,
            kind: 'opencode',
            ...(this.aiAccount.gatewayBaseUrl.trim()
              ? {
                  gateway: {
                    providerId: this.aiAccount.gatewayProviderId.trim() || 'workspace-gateway',
                    displayName: this.aiAccount.gatewayDisplayName.trim() || 'Workspace AI gateway',
                    baseUrl: this.aiAccount.gatewayBaseUrl.trim(),
                    protocol: 'openai-compatible' as const,
                  },
                }
              : {}),
          }
        : kind === 'codex'
          ? {
              ...base,
              kind: 'codex',
              credentialSource: existing?.kind === 'codex' ? existing.credentialSource : 'isolated',
            }
          : { ...base, kind: 'claude', credentialSource: 'isolated' };
    const next = this.synchronizeDeliveryContext(
      { ...current, connections: upsertSettingsItem(current.connections, connection) },
      data.workspaceId,
    );
    if (!(await this.store.saveSettings(next, this.busy() ? false : 'Settings saved.'))) {
      return undefined;
    }
    this.aiAccountId.set(connectionId);
    return connectionId;
  }
  private synchronizeDeliveryContext(settings: Settings, workspaceId: string): Settings {
    return this.store.synchronizeDeliveryContext(settings, workspaceId);
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

  private createAiAccountDraft() {
    const data = this.data;
    const connection =
      data.kind === 'ai-account' && data.connectionId
        ? this.store
            .settings()
            ?.connections.find(
              (item): item is AiConnection =>
                item.id === data.connectionId &&
                item.workspaceId === data.workspaceId &&
                (item.kind === 'codex' || item.kind === 'claude' || item.kind === 'opencode'),
            )
        : undefined;
    const kind: AiRuntimeKind =
      connection?.kind ?? (data.kind === 'ai-account' ? (data.runtime ?? 'codex') : 'codex');
    return this.createTrackedDraft({
      kind,
      displayName: connection?.displayName ?? `${AI_RUNTIME_LABELS[kind]} account`,
      credentialRef: connection?.credentialRef ?? '',
      gatewayProviderId:
        connection?.kind === 'opencode' ? (connection.gateway?.providerId ?? '') : '',
      gatewayDisplayName:
        connection?.kind === 'opencode' ? (connection.gateway?.displayName ?? '') : '',
      gatewayBaseUrl: connection?.kind === 'opencode' ? (connection.gateway?.baseUrl ?? '') : '',
      loginMethod: 'chatgpt' as 'chatgpt' | 'api-key',
      apiKey: '',
      authorizationCode: '',
    });
  }

  private requireSettings(): Settings {
    const settings = this.store.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  /** Stops the account polling owned by this drawer before disposing its lifecycle. @public */
  public override dispose(): void {
    this.stopWatchingAiAccountSignIn();
    super.dispose();
  }
  // #endregion
}
