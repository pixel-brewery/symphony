// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import type { IAiOperations, AiUsageProvider, IAiUsageWindow } from '@symphony/frontend-core/ai';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type {
  ApplicationSettingsDto,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';
import type { IAiClient } from '../ports/IAiClient';
import type { IAiContext } from '../ports/IAiContext';
import type { IAiConfiguration } from '../ports/IAiConfiguration';
import { AI_CLIENT } from '../ports/AiClientToken';
import { AI_CONTEXT } from '../ports/AiContextToken';
import { AI_CONFIGURATION } from '../ports/AiConfigurationToken';

// #endregion

/**
 * Owns AI account operations, model catalogs and quota state; consumes the single shared settings writer.
 *
 * @public
 */
@Injectable()
export class AiStore implements IAiOperations {
  // #region Fields

  private readonly _client: IAiClient;
  private readonly _context: IAiContext;
  private readonly _configuration: IAiConfiguration;
  private readonly _notifications: NotificationService;

  private readonly _aiUsageByConnectionId = signal<ReadonlyMap<string, readonly IAiUsageWindow[]>>(
    new Map(),
  );

  private readonly _aiUsageBusyConnectionIds = signal<ReadonlySet<string>>(new Set());

  private readonly _aiUsageRequestIds = new Map<string, number>();

  private _aiUsageRequestId = 0;

  private _codexConfigurationRequestId = 0;
  private readonly _codexConfiguration = signal<
    ResponsePayload<'codex.configuration.get'> | undefined
  >(undefined);
  private readonly _codexConfigurationAccountId = signal<string | undefined>(undefined);
  private readonly _availableAiModels = signal<ResponsePayload<'ai.models.get'> | undefined>(
    undefined,
  );
  private readonly _modelIntelligence = signal<ResponsePayload<'ai.intelligence.get'> | undefined>(
    undefined,
  );
  private readonly _codexConfigurationBusy = signal(false);
  private readonly _availableAiModelsBusy = signal(false);
  private readonly _modelIntelligenceBusy = signal(false);
  private readonly _connectionBusy = signal(false);
  /**
   * AI-owned codexConfiguration projection.
   *
   * @public
   * @readonly
   */
  public readonly codexConfiguration = this._codexConfiguration.asReadonly();
  /**
   * AI-owned codexConfigurationAccountId projection.
   *
   * @public
   * @readonly
   */
  public readonly codexConfigurationAccountId = this._codexConfigurationAccountId.asReadonly();
  /**
   * AI-owned codexConfigurationBusy projection.
   *
   * @public
   * @readonly
   */
  public readonly codexConfigurationBusy = this._codexConfigurationBusy.asReadonly();
  /**
   * AI-owned availableAiModels projection.
   *
   * @public
   * @readonly
   */
  public readonly availableAiModels = this._availableAiModels.asReadonly();
  /**
   * AI-owned availableAiModelsBusy projection.
   *
   * @public
   * @readonly
   */
  public readonly availableAiModelsBusy = this._availableAiModelsBusy.asReadonly();
  /**
   * AI-owned modelIntelligence projection.
   *
   * @public
   * @readonly
   */
  public readonly modelIntelligence = this._modelIntelligence.asReadonly();
  /**
   * AI-owned modelIntelligenceBusy projection.
   *
   * @public
   * @readonly
   */
  public readonly modelIntelligenceBusy = this._modelIntelligenceBusy.asReadonly();
  /**
   * AI-owned connectionBusy projection.
   *
   * @public
   * @readonly
   */
  public readonly connectionBusy = this._connectionBusy.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Connects only the feature's consumed transport and aggregate refresh dependencies.
   *
   * @public
   */
  public constructor(
    @Inject(AI_CLIENT) client: IAiClient = inject(AI_CLIENT),
    @Inject(AI_CONTEXT) context: IAiContext = inject(AI_CONTEXT),
    @Inject(AI_CONFIGURATION) configuration: IAiConfiguration = inject(AI_CONFIGURATION),
    @Inject(NotificationService) notifications: NotificationService = inject(NotificationService),
  ) {
    this._client = client;
    this._context = context;
    this._configuration = configuration;
    this._notifications = notifications;
  }

  // #endregion

  // #region Properties

  /** Actual native installer availability, without deriving it from cached health. @public @readonly */
  public get nativeInstallAvailable(): boolean {
    return this._context.nativeInstallAvailable;
  }

  /** Current authoritative settings consumed by AI-owned forms. @public @readonly */
  public get settings(): IAiContext['settings'] {
    return this._context.settings;
  }
  /** Shared settings and feature account activity. @public @readonly */
  public get configurationBusy(): IAiContext['configurationBusy'] {
    return this._context.configurationBusy;
  }
  /** Shared cross-editor activity exclusion. @public @readonly */
  public get editorBusy(): IAiContext['editorBusy'] {
    return this._context.editorBusy;
  }
  /** Existing provider account statuses. @public @readonly */
  public get connections(): IAiContext['connections'] {
    return this._context.connections;
  }
  /** Existing native tool availability. @public @readonly */
  public get runtimeHealth(): IAiContext['runtimeHealth'] {
    return this._context.runtimeHealth;
  }
  /** Existing native installer lifecycle. @public @readonly */
  public get runtimeDependencyInstallBusy(): IAiContext['runtimeDependencyInstallBusy'] {
    return this._context.runtimeDependencyInstallBusy;
  }

  // #endregion

  // #region Methods
  /** Persists an AI-owned form through the single validated settings writer. @public */
  public saveSettings(
    settings: ApplicationSettingsDto,
    successMessage?: string | false,
  ): Promise<boolean> {
    return this._configuration.saveSettings(settings, successMessage);
  }
  /** Hydrates the shared settings needed by an AI-owned form. @public */
  public refreshConfiguration(): Promise<void> {
    return this._configuration.refreshConfiguration();
  }
  /** Reconciles the authoritative provider status after external sign-in. @public */
  public refreshProviderConnections(): Promise<void> {
    return this._configuration.refreshProviderConnections();
  }
  /** Consumes the selected native runtime's existing installer. @public */
  public installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean> {
    return this._configuration.installRuntimeDependency(command);
  }
  /** Consumes optional Team reconciliation within the same settings transaction. @public */
  public synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
  ): ApplicationSettingsDto {
    return this._configuration.synchronizeDeliveryContext(settings, workspaceId);
  }

  /**
   * Refreshes the codex configuration.
   *
   * @param accountId - Account id.
   * @public
   */
  public async refreshCodexConfiguration(accountId?: string): Promise<boolean> {
    const resolvedAccountId = accountId ?? this.activeCodexAccountId();
    if (!resolvedAccountId) {
      this.clearCodexConfiguration();
      return false;
    }
    const requestId = ++this._codexConfigurationRequestId;
    this._codexConfigurationBusy.set(true);
    try {
      this._codexConfiguration.set(undefined);
      this._codexConfigurationAccountId.set(undefined);
      const configuration = await this._client.request('codex.configuration.get', {
        accountId: resolvedAccountId,
      });
      if (requestId !== this._codexConfigurationRequestId) return false;
      this._codexConfiguration.set(configuration);
      this._codexConfigurationAccountId.set(resolvedAccountId);
      return true;
    } catch (cause) {
      if (requestId === this._codexConfigurationRequestId) {
        this.showError(cause, 'Unable to load Codex models and usage.');
      }
      return false;
    } finally {
      if (requestId === this._codexConfigurationRequestId) {
        this._codexConfigurationBusy.set(false);
      }
    }
  }

  /**
   * Clears the codex configuration.
   *
   * @public
   */
  public clearCodexConfiguration(): void {
    this._codexConfigurationRequestId += 1;
    this._codexConfiguration.set(undefined);
    this._codexConfigurationAccountId.set(undefined);
    this._codexConfigurationBusy.set(false);
  }

  /**
   * Refreshes the AI usage.
   *
   * @param input - Input.
   * @public
   */
  public async refreshAiUsage(input: {
    readonly connectionId: string;
    readonly provider: AiUsageProvider;
  }): Promise<boolean> {
    const { connectionId, provider } = input;
    if (provider !== 'codex') {
      this._aiUsageByConnectionId.update((current) => new Map(current).set(connectionId, []));
      return false;
    }

    const requestId = ++this._aiUsageRequestId;
    this._aiUsageRequestIds.set(connectionId, requestId);
    this._aiUsageBusyConnectionIds.update((current) => new Set(current).add(connectionId));
    try {
      const configuration = await this._client.request('codex.configuration.get', {
        accountId: connectionId,
      });
      if (this._aiUsageRequestIds.get(connectionId) !== requestId) return false;
      this._aiUsageByConnectionId.update((current) =>
        new Map(current).set(connectionId, configuration.usage?.windows ?? []),
      );
      return true;
    } catch (cause) {
      if (this._aiUsageRequestIds.get(connectionId) === requestId) {
        this._aiUsageByConnectionId.update((current) => new Map(current).set(connectionId, []));
        this.showError(cause, 'Unable to load AI usage.');
      }
      return false;
    } finally {
      if (this._aiUsageRequestIds.get(connectionId) === requestId) {
        this._aiUsageRequestIds.delete(connectionId);
        this._aiUsageBusyConnectionIds.update((current) => {
          const next = new Set(current);
          next.delete(connectionId);
          return next;
        });
      }
    }
  }

  /**
   * Returns the AI usage for.
   *
   * @param connectionId - Connection id.
   * @public
   */
  public aiUsageFor(connectionId: string): readonly IAiUsageWindow[] | undefined {
    return this._aiUsageByConnectionId().get(connectionId);
  }

  /**
   * Returns the AI usage busy for.
   *
   * @param connectionId - Connection id.
   * @public
   */
  public aiUsageBusyFor(connectionId: string): boolean {
    return this._aiUsageBusyConnectionIds().has(connectionId);
  }

  /**
   * Refreshes the available AI models.
   *
   * @param input - Input.
   * @public
   */
  public async refreshAvailableAiModels(input: RequestPayload<'ai.models.get'>): Promise<boolean> {
    this._availableAiModelsBusy.set(true);
    try {
      const models = await this._client.request('ai.models.get', input);
      this._availableAiModels.set(models);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to load models from the AI runtime.');
      return false;
    } finally {
      this._availableAiModelsBusy.set(false);
    }
  }

  /**
   * Refreshes the model intelligence.
   *
   * @param input - Input.
   * @public
   */
  public async refreshModelIntelligence(
    input: RequestPayload<'ai.intelligence.get'>,
  ): Promise<boolean> {
    this._modelIntelligenceBusy.set(true);
    try {
      const report = await this._client.request('ai.intelligence.get', input);
      this._modelIntelligence.set(report);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to load model intelligence scores.');
      return false;
    } finally {
      this._modelIntelligenceBusy.set(false);
    }
  }

  /**
   * Connects the codex.
   *
   * @param input - Input.
   * @public
   */
  public async connectCodex(
    input:
      | { mode: 'chatgpt'; accountId: string }
      | { mode: 'api-key'; accountId: string; apiKey: string },
  ): Promise<boolean> {
    return this.runAccountOperation('codex.login.start', input, input.accountId);
  }

  /**
   * Disconnects the codex.
   *
   * @param accountId - Account id.
   * @public
   */
  public async disconnectCodex(accountId: string): Promise<boolean> {
    return this.runAccountOperation('codex.logout', { accountId }, accountId);
  }

  /**
   * Connects the claude.
   *
   * @param accountId - Account id.
   * @public
   */
  public async connectClaude(accountId: string): Promise<boolean> {
    return this.runAccountOperation('claude.login.start', { accountId });
  }

  /**
   * Completes the claude login.
   *
   * @param accountId - Account id.
   * @param authorizationCode - Authorization code.
   * @public
   */
  public async completeClaudeLogin(accountId: string, authorizationCode: string): Promise<boolean> {
    return this.runAccountOperation('claude.login.complete', {
      accountId,
      authorizationCode,
    });
  }

  /**
   * Disconnects the claude.
   *
   * @param accountId - Account id.
   * @public
   */
  public async disconnectClaude(accountId: string): Promise<boolean> {
    return this.runAccountOperation('claude.logout', { accountId });
  }

  /**
   * Imports the open code credentials.
   *
   * @param accountId - Account id.
   * @public
   */
  public async importOpenCodeCredentials(accountId: string): Promise<boolean> {
    return this.runAccountOperation('opencode.credentials.import', { accountId });
  }

  private activeCodexAccountId(): string | undefined {
    const settings = this._context.settings();
    if (!settings) return undefined;
    const profile = this.activeAgentProfile();
    const routePolicy = settings.agentRoutePolicies.find(
      (candidate) => candidate.id === profile?.routePolicyId,
    );
    const accountId = routePolicy?.candidates[0]?.aiConnectionId;
    const connection = settings.connections.find(
      (candidate) => candidate.id === accountId && candidate.kind === 'codex',
    );
    return connection?.id;
  }

  private activeAgentProfile(): ApplicationSettingsDto['agentProfiles'][number] | undefined {
    const settings = this._context.settings();
    const workspaceId = settings?.activeViewScope.workspaceIds[0];
    if (!settings || !workspaceId) return undefined;
    const context = settings.deliveryContexts.find(
      (candidate) => candidate.enabled && candidate.workspaceId === workspaceId,
    );
    const team = settings.agentTeams.find(
      (candidate) => candidate.id === context?.agentTeamId || candidate.workspaceId === workspaceId,
    );
    const agentId = team?.assignments.find(
      (assignment) => assignment.role === 'analysis',
    )?.primaryAgentId;
    return settings.agentProfiles.find(
      (profile) => profile.id === agentId || profile.workspaceId === workspaceId,
    );
  }
  private async runAccountOperation<
    M extends
      | 'codex.login.start'
      | 'codex.logout'
      | 'claude.login.start'
      | 'claude.login.complete'
      | 'claude.logout'
      | 'opencode.credentials.import',
  >(method: M, payload: RequestPayload<M>, refreshCodexAccountId?: string): Promise<boolean> {
    if (this._connectionBusy() || this._context.configurationBusy()) return false;
    this._connectionBusy.set(true);
    try {
      const result = await this._client.request(method, payload);
      if (result.status === 'completed') this._notifications.showSuccess(result.message);
      else this._notifications.showInfo(result.message);
      if (result.status === 'completed') {
        await this._configuration.refreshProviderConnections();
        if (refreshCodexAccountId) await this.refreshCodexConfiguration(refreshCodexAccountId);
      }
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to update provider connection.');
      return false;
    } finally {
      this._connectionBusy.set(false);
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
