// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { VIEW_SLOT_CONTEXT, type IViewSlotContext } from '@pixel-brewery/mosaik-elements-angular';
import { Command } from '@symphony/frontend-core';
import {
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
  type ISettingsEditorRequest,
  type ISettingsServiceSelection,
} from '@symphony/frontend-setting';
import { AI_RUNTIME_LABELS } from '@symphony/frontend-ui';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AiStore } from '../state/AiStore';
import { aiAccountRemovalBlockers, withoutAiAccount } from './ai-account-removal';
import { aiAccountSignIn } from './aiAccountSignIn';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion
type ProviderConnection = ApplicationSettingsDto['connections'][number];
/** Owns AI account rows, optional connections and their existing removal workflow. @public */
@Injectable()
export class AiConnectionsSettingsViewPresenter {
  // #region Fields
  /** Actual AI owner and bounded authoritative configuration. @public @readonly */
  public readonly store = inject(AiStore);
  private readonly _settingsEditors = inject(SettingsEditorService);
  private readonly _settingsHost = inject(SettingsHostSession);
  private readonly _selection =
    inject<IViewSlotContext<ISettingsServiceSelection>>(VIEW_SLOT_CONTEXT);
  /** Workspace selected by the parent native Services outlet. @public @readonly */
  public readonly workspace = computed(() =>
    this.store
      .settings()
      ?.workspaces.find((item) => item.id === this._selection.selection()?.workspaceId),
  );
  /** Exactly the configured account row selected by the Services host. @public @readonly */
  public readonly account = computed(() => {
    const selection = this._selection.selection();
    const account = this.store
      .settings()
      ?.connections.find(
        (item) =>
          item.id === selection?.connectionId && item.workspaceId === selection?.workspaceId,
      );
    return account?.kind === 'codex' || account?.kind === 'claude' || account?.kind === 'opencode'
      ? account
      : undefined;
  });
  /** Opens this AI-owned account editor. @public @readonly */
  public readonly openAccountCommand = new Command<ProviderConnection>((account) => {
    if (account.kind === 'codex' || account.kind === 'claude' || account.kind === 'opencode')
      this.openEditor({
        kind: 'ai-account',
        workspaceId: account.workspaceId,
        connectionId: account.id,
      });
  });

  private readonly _alerts = inject(SettingsAlertService);

  /**
   * The AI runtimes.
   *
   * @public
   * @readonly
   */
  public readonly aiRuntimes = ['codex', 'claude', 'opencode'] as const;

  private readonly _aiRuntimeLabel = computed(
    () => (runtime: 'codex' | 'claude' | 'opencode') => this.resolveAiRuntimeLabel(runtime),
  );

  private readonly _aiRuntimeSummary = computed(
    () => (runtime: 'codex' | 'claude' | 'opencode') => this.resolveAiRuntimeSummary(runtime),
  );

  private readonly _aiAccountSummary = computed(
    () => (account: ProviderConnection) => this.resolveAiAccountSummary(account),
  );

  private readonly _confirmRemoveAiAccountCommand: Command<ProviderConnection> = new Command(
    (account) => void this.onExecuteConfirmRemoveAiAccountCommand(account),
  );

  private readonly _openAiAccountCommand: Command<
    readonly [workspaceId: string, runtime?: 'codex' | 'claude' | 'opencode']
  > = new Command((parameters) => void this.onExecuteOpenAiAccountCommand(...parameters));
  // #endregion
  // #region Properties

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
   * The aiRuntimeSummary projection.
   *
   * @public
   * @readonly
   */
  public get aiRuntimeSummary() {
    return this._aiRuntimeSummary;
  }

  /**
   * The aiAccountSummary projection.
   *
   * @public
   * @readonly
   */
  public get aiAccountSummary() {
    return this._aiAccountSummary;
  }

  /**
   * The confirmRemoveAiAccount command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveAiAccountCommand(): Command<ProviderConnection> {
    return this._confirmRemoveAiAccountCommand;
  }

  /**
   * The openAiAccount command.
   *
   * @public
   * @readonly
   */
  public get openAiAccountCommand(): Command<
    readonly [workspaceId: string, runtime?: 'codex' | 'claude' | 'opencode']
  > {
    return this._openAiAccountCommand;
  }
  // #endregion
  // #region Methods

  /**
   * Returns the AI runtime label.
   *
   * @param runtime - Runtime.
   * @private
   */
  private resolveAiRuntimeLabel(runtime: 'codex' | 'claude' | 'opencode'): string {
    return AI_RUNTIME_LABELS[runtime];
  }

  /**
   * Returns the AI runtime summary.
   *
   * @param runtime - Runtime.
   * @private
   */
  private resolveAiRuntimeSummary(runtime: 'codex' | 'claude' | 'opencode'): string {
    const health = this.store.runtimeHealth()?.agents[runtime];
    const cli = !health
      ? translateLabel('loc.symphony.labels.checking.cli.36465af')
      : health.available
        ? ''
        : translateLabel('loc.symphony.labels.cli.not.installed.3c0bf11');
    switch (runtime) {
      case 'codex':
        return translateLabel(
          'loc.symphony.labels.chatgpt.subscription.or.openai.api.key.86b18f7',
          cli,
        );
      case 'claude':
        return translateLabel('loc.symphony.labels.claude.subscription.7e92b6a', cli);
      case 'opencode':
        return translateLabel(
          'loc.symphony.labels.provider.sign.ins.stored.by.opencode.68de4e1',
          cli,
        );
    }
  }

  /**
   * Sub-label of an AI account cell under Connected services.
   *
   * @param account - Account.
   * @private
   */
  private resolveAiAccountSummary(account: ProviderConnection): string {
    if (account.kind !== 'codex' && account.kind !== 'claude' && account.kind !== 'opencode') {
      return '';
    }
    const label = AI_RUNTIME_LABELS[account.kind];
    if (account.kind === 'opencode') {
      return `${label}${account.gateway ? ` · ${account.gateway.displayName}` : ''}`;
    }
    return `${label} · ${aiAccountSignIn(account, this.store.connections())}`;
  }

  /**
   * Whether it is AI account.
   *
   * @param account - Account.
   * @private
   */
  private resolveIsAiAccount(account: ProviderConnection): boolean {
    return account.kind === 'codex' || account.kind === 'claude' || account.kind === 'opencode';
  }

  /**
   * Removes a connected AI account from the workspace, including its sign-in and backup routes.
   *
   * @param account - Account.
   * @private
   */
  private onExecuteConfirmRemoveAiAccountCommand(account: ProviderConnection): void {
    if (!this.resolveIsAiAccount(account)) return;
    const settings = this.requireSettings();
    const blockers = aiAccountRemovalBlockers(settings, account.id);
    if (blockers.length) {
      void this._alerts.confirm({
        id: `remove-ai-account-blocked-${account.id}`,
        header: translateLabel('loc.symphony.labels.this.account.is.still.in.use.3aef81b'),
        get message() {
          return blockers.length === 1
            ? translateLabel(
                'loc.symphony.labels.runs.on.this.account.move.that.agent.to.another.ai.a.56f37f3',
                blockers.join(', '),
              )
            : translateLabel(
                'loc.symphony.labels.run.on.this.account.move.those.agents.to.another.ai..4aa69fa',
                blockers.join(', '),
              );
        },
        tone: 'warning',
        confirmLabel: translateLabel('loc.symphony.labels.ok.565339b'),
      });
      return;
    }
    void this._alerts
      .confirm({
        id: `remove-ai-account-${account.id}`,
        header: translateLabel('loc.symphony.labels.remove.9d64ce8', account.displayName),
        get message() {
          return translateLabel(
            'loc.symphony.labels.symphony.signs.the.account.out.deletes.its.isolated..c69dd43',
          );
        },
        tone: 'danger',
        confirmLabel: translateLabel('loc.symphony.labels.remove.account.fd35618'),
        cancelLabel: translateLabel('loc.symphony.labels.keep.account.9be7d99'),
        destructive: true,
      })
      .then((confirmed) => {
        if (!confirmed) return;
        void this.removeAiAccount(account);
      });
  }

  /**
   * Opens the AI-account editor (Connected services); `runtime` preselects the provider.
   *
   * @param workspaceId - Workspace id.
   * @param runtime - Runtime.
   * @private
   */
  private onExecuteOpenAiAccountCommand(
    workspaceId: string,
    runtime?: 'codex' | 'claude' | 'opencode',
  ): void {
    this.openEditor({ kind: 'ai-account', workspaceId, runtime });
  }

  private async removeAiAccount(account: ProviderConnection): Promise<void> {
    const signedIn =
      account.kind === 'codex'
        ? this.store.connections()?.codex.accounts.find((item) => item.id === account.id)
            ?.authenticated
        : account.kind === 'claude'
          ? this.store.connections()?.claude.accounts.find((item) => item.id === account.id)
              ?.authenticated
          : false;
    if (signedIn && account.kind === 'codex') await this.store.disconnectCodex(account.id);
    if (signedIn && account.kind === 'claude') await this.store.disconnectClaude(account.id);
    await this.store.saveSettings(withoutAiAccount(this.requireSettings(), account.id));
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
