// #region Imports

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { AuthManager, ProfileManager } from '@pixel-brewery/synapse-auth';
import type { IAuthHandle } from '@pixel-brewery/synapse-auth';
import { AiError, isCleanupIncomplete, parseSessionReference } from '@pixel-brewery/synapse-core';
import type {
  AiAuthDriverBase,
  AiDriverBase,
  IAiAuthInteraction,
  IAiAuthStatus,
  IAiInstance,
  IAiResult,
  IAiSessionReference,
} from '@pixel-brewery/synapse-core';
import { CodexDriver } from '@pixel-brewery/synapse-provider-codex';
import type { ICodexInspection } from '@pixel-brewery/synapse-provider-codex';
import { ClaudeDriver } from '@pixel-brewery/synapse-provider-claude';
import {
  OpenCodeDriver,
  importOpenCodeCredentials,
} from '@pixel-brewery/synapse-provider-opencode';
import {
  AiRuntime,
  NodeProcessRunner,
  ProfileAccessCoordinator,
} from '@pixel-brewery/synapse-runtime';
import type { ProcessRunnerBase } from '@pixel-brewery/synapse-runtime';
import type { ICodexConfigurationSnapshot } from '../codex-configuration/ICodexConfigurationSnapshot.js';
import type { ISynapseAiInstanceConfiguration } from './interfaces/ISynapseAiInstanceConfiguration.js';
import type { ISynapseAiRunRequest } from './interfaces/ISynapseAiRunRequest.js';
import type { ISynapseAiServiceOptions } from './interfaces/ISynapseAiServiceOptions.js';

// #endregion

type PreparedInstance = { readonly fingerprint: string; readonly instance: IAiInstance };

type DraftContinuation = {
  readonly instanceId: string;
  reference?: IAiSessionReference;
  expiresAt: number;
  active: boolean;
  invalidated: boolean;
};

/**
 * Stable orchestrator-scoped owner of Synapse execution, account changes and metadata.
 *
 * @remarks Business prompts, model catalog policy, SQLite and target-project worktrees remain in Symphony.
 *
 * @public
 */
export class SynapseAiService {
  // #region Fields

  private readonly _runner: ProcessRunnerBase;
  private readonly _profiles: ProfileManager;
  private readonly _access = new ProfileAccessCoordinator();
  private readonly _drivers: Readonly<
    Record<ISynapseAiInstanceConfiguration['provider'], AiDriverBase>
  >;
  private readonly _runtime: AiRuntime;
  private readonly _auth: AuthManager;
  private readonly _environment: Readonly<Record<string, string>>;
  private readonly _instances = new Map<string, PreparedInstance>();
  private readonly _configurationTails = new Map<string, Promise<void>>();
  private readonly _logins = new Map<string, IAuthHandle>();
  private readonly _inspections = new Map<AbortController, Promise<unknown>>();
  private readonly _continuations = new Map<string, DraftContinuation>();
  private _disposed = false;
  private _pendingConfigurations = 0;
  private _disposal?: Promise<void>;
  private _cleanupFailure?: AiError;

  // #endregion

  // #region Ctor

  /**
   * Creates one inert composition; processes and profiles start only through explicit operations.
   *
   * @param options - Private storage, host bootstrap environment and optional replay boundary.
   *
   * @public
   */
  public constructor(options: ISynapseAiServiceOptions) {
    this._runner = options.runner ?? new NodeProcessRunner();
    this._profiles = new ProfileManager({ rootDirectory: options.profileStoreRoot });
    this._environment = Object.freeze({ ...options.environment });
    this._drivers = {
      codex: new CodexDriver(this._runner),
      claude: new ClaudeDriver(this._runner),
      opencode: new OpenCodeDriver(this._runner),
    };
    this._runtime = new AiRuntime({
      drivers: Object.values(this._drivers),
      instances: [],
      access: this._access,
      // Preserve long-running Symphony turns; an explicit request deadline may tighten this native timer ceiling.
      defaultTimeoutMs: 2_147_483_647,
    });
    this._auth = new AuthManager(this._access, {
      defaultTimeoutMs: 600000,
      statusTimeoutMs: 15000,
    });
  }

  // #endregion

  // #region Methods

  /**
   * Executes a host-composed request with a correctly bound native continuation.
   *
   * @param configuration - Existing workspace/account mapping and explicit credential inputs.
   * @param request - Business prompt, policy and critical progress callback.
   * @returns The same native invocation's final result after owned cleanup.
   * @throws An AiError for cancellation, configuration, native or host persistence failure.
   *
   * @public
   */
  public async execute(
    configuration: ISynapseAiInstanceConfiguration,
    request: ISynapseAiRunRequest,
  ): Promise<IAiResult> {
    this.checkRequest(request);

    const instance = await this.configure(configuration, () => this.checkRequest(request));

    this.checkRequest(request);

    const {
      candidateId = instance.id,
      continuationReference,
      sessionKey,
      onEvent,
      ...native
    } = request;
    const cache =
      sessionKey !== undefined
        ? this.draftContinuation(instance, candidateId, sessionKey)
        : undefined;

    try {
      const explicit: IAiSessionReference | undefined = continuationReference
        ? (parseSessionReference(continuationReference) ?? {
            driverId: instance.driverId,
            instanceId: instance.id,
            profileId: instance.profile.id,
            candidateId,
            nativeId: continuationReference,
          })
        : undefined;
      const session = explicit ?? cache?.entry.reference;

      if (this._instances.get(instance.id)?.instance !== instance)
        throw new AiError(
          'configuration',
          'The AI account configuration changed before execution admission.',
        );

      const result = await this._runtime.run({
        ...native,
        target: { instanceId: instance.id, candidateId },
        ...(session ? { session } : {}),
        onEvent: async (event) => {
          if (cache && !cache.entry.invalidated && event.type === 'session')
            cache.entry.reference = event.session;

          if (onEvent) await onEvent(event);
        },
      }).result;

      if (cache && this._continuations.get(cache.key) === cache.entry)
        this._continuations.delete(cache.key);

      return result;
    } catch (error) {
      this.rememberCleanup(error);

      if (cache && this._continuations.get(cache.key) === cache.entry) {
        if (
          error instanceof AiError &&
          !error.cleanupIncomplete &&
          error.retryable &&
          error.sessionUsable &&
          !cache.entry.invalidated &&
          ['provider', 'quota', 'rate-limit'].includes(error.code) &&
          cache.entry.reference
        ) {
          cache.entry.active = false;
          cache.entry.expiresAt = Date.now() + 3600000;
        } else this._continuations.delete(cache.key);
      }

      throw error;
    }
  }

  /**
   * Reads bounded provider metadata without login, agent startup or application catalog ownership.
   *
   * @param configuration - Existing native account mapping.
   * @param signal - Optional caller cancellation; inspection also has a 15-second deadline.
   * @returns Neutral models/auth/limits plus optional safe native Codex usage metadata.
   * @throws An AiError when inspection, cancellation or credential refresh persistence fails; unconfirmed cleanup leaves the profile blocked.
   *
   * @public
   */
  public async inspect(
    configuration: ISynapseAiInstanceConfiguration,
    signal?: AbortSignal,
  ): Promise<ICodexInspection> {
    this.checkSignal(signal);

    if (this._inspections.size >= 64)
      throw new AiError('host', 'The AI metadata inspection limit has been reached.');

    const instance = await this.configure(configuration);

    this.checkSignal(signal);

    if (this._inspections.size >= 64)
      throw new AiError('host', 'The AI metadata inspection limit has been reached.');

    const controller = new AbortController();
    const abort = (): void =>
      controller.abort(new AiError('cancelled', 'AI metadata inspection was cancelled.'));

    signal?.addEventListener('abort', abort, { once: true });

    const timer = setTimeout(
      () => controller.abort(new AiError('timeout', 'AI metadata inspection expired.')),
      15000,
    );
    let release: ((error?: unknown) => void) | undefined;
    let nativeFailure: unknown;
    const work = (async () => {
      try {
        this.checkSignal(signal);
        release = this._access.enter(instance.profile.id, abort);

        return await this._drivers[configuration.provider].inspect(instance, controller.signal);
      } catch (error) {
        nativeFailure = error;
        this.rememberCleanup(error);

        throw error;
      } finally {
        release?.(nativeFailure);
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    })();

    this._inspections.set(controller, work);

    const clear = (): void => {
      this._inspections.delete(controller);
    };

    void work.then(clear, clear);

    return work;
  }

  /**
   * Projects native Codex metadata into the unchanged Symphony settings DTO.
   *
   * @param configuration - Existing Codex connection mapping.
   * @param signal - Optional bounded caller cancellation.
   * @returns Existing model choices and native usage windows with ISO timestamps.
   * @throws An AiError when a non-Codex configuration is supplied.
   *
   * @public
   */
  public async codexConfiguration(
    configuration: ISynapseAiInstanceConfiguration,
    signal?: AbortSignal,
  ): Promise<ICodexConfigurationSnapshot> {
    if (configuration.provider !== 'codex')
      throw new AiError('configuration', 'Codex metadata requires a Codex account.');

    const snapshot = await this.inspect(configuration, signal);

    return {
      models: (snapshot.models ?? []).map((model) => ({
        id: model.id,
        displayName: model.name ?? model.id,
        description: model.description ?? '',
        isDefault: model.isDefault ?? false,
        defaultReasoningEffort:
          model.defaultReasoningEffort ?? model.reasoningEfforts?.[0] ?? 'medium',
        reasoningEfforts: (model.reasoningEfforts ?? []).map((id) => ({
          id,
          description: model.reasoningDescriptions?.[id] ?? '',
        })),
      })),
      ...(snapshot.usage
        ? {
            usage: {
              ...snapshot.usage,
              windows: snapshot.usage.windows.map((window) => ({
                usedPercent: window.usedPercent,
                remainingPercent: window.remainingPercent,
                ...(window.windowDurationMinutes !== undefined
                  ? { windowDurationMinutes: window.windowDurationMinutes }
                  : {}),
                ...(window.resetsAt !== undefined
                  ? { resetsAt: new Date(window.resetsAt).toISOString() }
                  : {}),
              })),
            },
          }
        : {}),
      ...(snapshot.metadataWarnings?.length
        ? { error: 'Some native account usage information is temporarily unavailable.' }
        : {}),
    };
  }

  /**
   * Checks native authentication without launching login, hooks or inference.
   *
   * @param configuration - Existing isolated account.
   * @returns Safe verified native account state.
   *
   * @public
   */
  public async status(configuration: ISynapseAiInstanceConfiguration): Promise<IAiAuthStatus> {
    const instance = await this.configure(configuration);

    return this._auth.status(instance, this.authDriver(configuration));
  }

  /**
   * Starts a native browser flow and returns its first supported authorization URL.
   *
   * @param configuration - Account whose execution will be drained before sign-in.
   * @param methodId - Actual native browser procedure, e.g. chatgpt-browser or subscription.
   * @returns Native authorization URL for the existing desktop login interaction.
   * @throws An AiError when no URL is produced or the login fails/expires.
   *
   * @public
   */
  public async startBrowserLogin(
    configuration: ISynapseAiInstanceConfiguration,
    methodId: string,
  ): Promise<string> {
    const handle = await this.startLogin(configuration, methodId);
    const interaction = await this.waitForInteraction(handle);

    if (!interaction.url) {
      await handle.cancel();

      throw new AiError('protocol', 'The native login did not provide an authorization URL.');
    }

    return interaction.url;
  }

  /**
   * Observes the current native login through its separate verification and cleanup.
   *
   * @param configuration - Same account that explicitly began the native flow.
   * @returns Verified authentication, including a browser flow that already completed.
   * @throws An AiError for cancelled/failed login or when no verified account is available.
   * @remarks Waiting does not reconfigure an active flow or initiate another login.
   *
   * @public
   */
  public async waitForLogin(
    configuration: ISynapseAiInstanceConfiguration,
  ): Promise<IAiAuthStatus> {
    this.assertOpen();

    const handle = this._logins.get(this.identity(configuration));

    if (handle) return handle.result;

    const status = await this.status(configuration);

    if (!status.authenticated)
      throw new AiError('auth-required', 'Native sign-in has not completed for this account.');

    return status;
  }

  /**
   * Supplies one explicit credential through the native procedure's stdin interaction.
   *
   * @param configuration - Isolated account selected by the host.
   * @param methodId - Actual native credential procedure.
   * @param field - Driver-declared field identifier.
   * @param value - Credential held only in memory until the native CLI consumes it.
   * @returns Completion after native login and separate status verification.
   *
   * @public
   */
  public async loginWithCredential(
    configuration: ISynapseAiInstanceConfiguration,
    methodId: string,
    field: string,
    value: string,
  ): Promise<void> {
    const handle = await this.startLogin(configuration, methodId);

    try {
      await this.waitForInteraction(handle);
      this.respond(handle, field, value);
      await handle.result;
    } catch (error) {
      await handle.cancel();

      throw error;
    }
  }

  /**
   * Completes an existing native login with its declared optional manual code.
   *
   * @param configuration - Same account that began the owner-scoped login.
   * @param field - Native response field, e.g. authorizationCode.
   * @param value - Manual code, never logged or persisted by the bridge.
   * @returns Verified completion, including already-completed browser callbacks.
   * @throws An AiError when no current authenticated flow exists.
   *
   * @public
   */
  public async completeLogin(
    configuration: ISynapseAiInstanceConfiguration,
    field: string,
    value: string,
  ): Promise<void> {
    const handle = this._logins.get(this.identity(configuration));

    if (!handle) {
      if ((await this.status(configuration)).authenticated) return;

      throw new AiError(
        'auth-required',
        'Start native sign-in for this account before submitting a code.',
      );
    }

    if (handle.state.state === 'waiting') this.respond(handle, field, value);

    await handle.result;
  }

  /**
   * Cancels/drains login and executions before native logout for this account only.
   *
   * @param configuration - Account whose credentials are explicitly being removed.
   * @returns Completion after native logout and signed-out status verification.
   *
   * @public
   */
  public async logout(configuration: ISynapseAiInstanceConfiguration): Promise<void> {
    const instance = await this.configure(configuration);

    this.invalidateContinuations(instance.id);
    this._logins.delete(instance.id);
    await this._auth.logout(instance, this.authDriver(configuration));
  }

  /**
   * Imports an explicitly selected OpenCode auth file under exclusive profile access.
   *
   * @param configuration - Destination existing OpenCode account mapping.
   * @param sourceFile - Exact host-selected native auth.json file.
   * @returns Completion after owned execution drains and the private import is persisted.
   * @throws An AiError when another provider or an invalid file is supplied.
   *
   * @public
   */
  public async importOpenCodeCredentials(
    configuration: ISynapseAiInstanceConfiguration,
    sourceFile: string,
  ): Promise<void> {
    if (configuration.provider !== 'opencode')
      throw new AiError('configuration', 'Credential import requires an OpenCode account.');

    const instance = await this.configure(configuration);

    this.invalidateContinuations(instance.id);
    await this._logins.get(instance.id)?.cancel();
    this._logins.delete(instance.id);
    await this._access.credentialChange(instance.profile, () =>
      importOpenCodeCredentials(sourceFile, instance),
    );
  }

  /**
   * Stops and awaits every owned inference, login, metadata check and configuration operation.
   *
   * @returns Idempotent complete teardown of the shared native runtime.
   * @throws An AiError after all cleanup attempts settle if native teardown fails or remains unconfirmed.
   *
   * @public
   */
  public dispose(): Promise<void> {
    if (this._disposal) return this._disposal;

    this._disposed = true;

    for (const controller of this._inspections.keys())
      controller.abort(new AiError('cancelled', 'AI service is shutting down.'));

    this._disposal = Promise.allSettled([
      this._auth.dispose(),
      this._runtime.dispose(),
      ...this._configurationTails.values(),
      ...this._inspections.values(),
    ]).then((outcomes) => {
      for (const outcome of outcomes)
        if (outcome.status === 'rejected') this.rememberCleanup(outcome.reason);

      this._instances.clear();
      this._logins.clear();
      this._continuations.clear();

      if (this._cleanupFailure) throw this._cleanupFailure;

      const teardownFailure = outcomes.slice(0, 2).find((outcome) => outcome.status === 'rejected');

      if (teardownFailure?.status === 'rejected')
        throw new AiError('host', 'The native AI service could not complete teardown.', {
          cause: teardownFailure.reason,
        });
    });

    return this._disposal;
  }

  private async configure(
    configuration: ISynapseAiInstanceConfiguration,
    guard: () => void = () => this.assertOpen(),
  ): Promise<IAiInstance> {
    this.assertOpen();

    const id = this.identity(configuration);
    const fingerprint = createHash('sha256').update(JSON.stringify(configuration)).digest('hex');
    const previous = this._instances.get(id);

    if (previous?.fingerprint === fingerprint && !this._configurationTails.has(id))
      return previous.instance;

    if (this._pendingConfigurations >= 128)
      throw new AiError('host', 'The AI account preparation limit has been reached.');

    this._pendingConfigurations++;

    const prior = this._configurationTails.get(id) ?? Promise.resolve();
    const work = prior.then(async () => {
      this.assertOpen();
      guard();

      const current = this._instances.get(id);

      if (current?.fingerprint === fingerprint) return current.instance;

      if (!current && this._instances.size >= 1024)
        throw new AiError('host', 'The configured AI account limit has been reached.');

      if (current) {
        this.invalidateContinuations(id);
        await this._logins.get(id)?.cancel();
        this._logins.delete(id);
      }

      const codex = configuration.provider === 'codex';
      const openCode = configuration.provider === 'opencode';
      const profile = await this._profiles.create({
        id,
        applicationId: `symphony:${configuration.workspaceId}`,
        accountId: configuration.id,
        driverId: configuration.provider,
        paths: {
          root: configuration.root,
          home: codex
            ? join(configuration.root, 'execution', 'home')
            : openCode
              ? configuration.root
              : join(configuration.root, 'home'),
          credentials:
            configuration.provider === 'claude'
              ? join(configuration.root, 'configuration')
              : configuration.root,
          configuration: openCode
            ? join(configuration.root, '.config', 'opencode')
            : join(configuration.root, 'configuration'),
          execution: join(configuration.root, 'execution'),
          ...(codex ? { sqlite: join(configuration.root, 'execution', 'sqlite') } : {}),
        },
      });

      this.assertOpen();
      guard();

      const instance: IAiInstance = Object.freeze({
        id,
        driverId: configuration.provider,
        profile,
        ...(configuration.executable ? { executable: configuration.executable } : {}),
        environment: Object.freeze({ ...this._environment, ...configuration.environment }),
        ...(configuration.configuration
          ? { configuration: Object.freeze({ ...configuration.configuration }) }
          : {}),
      });

      await this._runtime.configureInstance(instance);
      this._instances.set(id, { fingerprint, instance });

      return instance;
    });
    const tail = work
      .then(
        () => undefined,
        (error: unknown) => this.rememberCleanup(error),
      )
      .finally(() => {
        this._pendingConfigurations--;
      });

    this._configurationTails.set(id, tail);
    void tail.then(() => {
      if (this._configurationTails.get(id) === tail) this._configurationTails.delete(id);
    });

    return work;
  }

  private identity(configuration: ISynapseAiInstanceConfiguration): string {
    return `symphony:${createHash('sha256')
      .update(JSON.stringify([configuration.workspaceId, configuration.provider, configuration.id]))
      .digest('hex')}`;
  }

  private authDriver(configuration: ISynapseAiInstanceConfiguration): AiAuthDriverBase {
    const auth = this._drivers[configuration.provider].auth;

    if (!auth)
      throw new AiError('unsupported', 'This AI provider has no native authentication procedure.');

    return auth;
  }

  private async startLogin(
    configuration: ISynapseAiInstanceConfiguration,
    methodId: string,
  ): Promise<IAuthHandle> {
    const instance = await this.configure(configuration);

    this.invalidateContinuations(instance.id);

    const handle = this._auth.start(instance, this.authDriver(configuration), {
      ownerId: instance.id,
      methodId,
    });

    this._logins.set(instance.id, handle);

    return handle;
  }

  private async waitForInteraction(handle: IAuthHandle): Promise<IAiAuthInteraction> {
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observe = (async () => {
      for await (const state of handle.events) {
        if (state.state === 'waiting') return state.interaction;

        if (state.state === 'failed' || state.state === 'cancelled') await handle.result;
      }

      await handle.result;

      throw new AiError('protocol', 'Native sign-in completed without its expected interaction.');
    })();

    try {
      return await Promise.race([
        observe,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            expired = true;
            void handle.cancel().then(
              () =>
                reject(
                  new AiError('timeout', 'Native sign-in did not provide an interaction in time.'),
                ),
              () =>
                reject(
                  new AiError(
                    'timeout',
                    'Native sign-in could not stop after its interaction deadline.',
                  ),
                ),
            );
          }, 15000);
        }),
      ]);
    } catch (error) {
      await handle.cancel();

      if (expired)
        throw new AiError('timeout', 'Native sign-in did not provide an interaction in time.');

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private respond(handle: IAuthHandle, field: string, value: string): void {
    const state = handle.state;

    if (state.state !== 'waiting')
      throw new AiError('protocol', 'The native authentication interaction is no longer waiting.');

    handle.respond({
      ownerId: state.ownerId,
      operationId: state.operationId,
      interactionId: state.interaction.id,
      values: { [field]: value },
    });
  }

  private checkRequest(request: ISynapseAiRunRequest): void {
    this.assertOpen();
    this.checkSignal(request.signal);

    if (request.deadline !== undefined && request.deadline <= Date.now())
      throw new AiError('timeout', 'The AI deadline expired before profile preparation.');
  }

  private checkSignal(signal?: AbortSignal): void {
    if (signal?.aborted) throw new AiError('cancelled', 'The AI operation was cancelled.');
  }

  private assertOpen(): void {
    if (this._disposed) throw new AiError('disposed', 'The shared AI service has been disposed.');
  }

  private draftContinuation(
    instance: IAiInstance,
    candidateId: string,
    operation: string,
  ): { key: string; entry: DraftContinuation } {
    if (operation.length > 1024 || !operation.trim())
      throw new AiError('configuration', 'The draft operation identifier is invalid.');

    for (const [key, entry] of this._continuations)
      if (!entry.active && entry.expiresAt <= Date.now()) this._continuations.delete(key);

    const key = JSON.stringify([instance.id, instance.profile.id, candidateId, operation]);
    const existing = this._continuations.get(key);

    if (existing?.active) throw new AiError('host', 'This draft operation is already executing.');

    if (existing) {
      existing.active = true;

      return { key, entry: existing };
    }

    if (this._continuations.size >= 128) {
      const retired = [...this._continuations].find(([, entry]) => !entry.active);

      if (!retired)
        throw new AiError('host', 'The active draft continuation limit has been reached.');

      this._continuations.delete(retired[0]);
    }

    const entry: DraftContinuation = {
      instanceId: instance.id,
      expiresAt: Date.now() + 3600000,
      active: true,
      invalidated: false,
    };

    this._continuations.set(key, entry);

    return { key, entry };
  }

  private invalidateContinuations(instanceId: string): void {
    for (const [key, entry] of this._continuations)
      if (entry.instanceId === instanceId) {
        if (entry.active) {
          entry.reference = undefined;
          entry.invalidated = true;
        } else this._continuations.delete(key);
      }
  }

  private rememberCleanup(error: unknown): void {
    if (isCleanupIncomplete(error))
      this._cleanupFailure ??= new AiError(
        'host',
        'Native AI process cleanup could not be confirmed.',
        { cleanupIncomplete: true, cause: error },
      );
  }

  // #endregion
}
