// #region Imports
import {
  type ProviderConnection,
  type IAgentExecutionTarget,
  agentExecutionTargetsFor,
} from '@symphony/configuration-composition';
import {
  SynapseAgentRuntime,
  type ISynapseAiInstanceConfiguration,
} from '@symphony/providers-synapse';
import {
  resolveAllowedCommand,
  toolchainSearchPath,
  inspectAllowedCommand,
} from '@symphony/providers-core';
import { type IProviderConnectionStatus } from '@symphony/domain-platform';
import { inspectGitHubConnections } from '@symphony/providers-github';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { type IProvideAiOrchestratorFeatureDependencies } from './IProvideAiOrchestratorFeatureDependencies';
import { aiRequestSchemas, aiResponseSchemas } from '@symphony/ipc-contracts-ai';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
import { type IWorkspaceAgentRuntimeOptions } from '@symphony/providers-ai';
import {
  simulatedCodexConfiguration,
  simulatedModelIntelligence,
} from '@symphony/providers-simulated';
// #endregion

/**
 * Owns ai commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideAiOrchestratorFeature(
  dependencies: IProvideAiOrchestratorFeatureDependencies,
) {
  const {
    synapseAi,
    settingsState,
    modelIntelligence,
    agentModelLockout,
    agentAccountCooldowns,
    isolatedRuntimeHome,
    logger,
  } = dependencies;
  const pendingClaudeSubscriptionSwitches = new Map<
    string,
    { readonly connection: Extract<ProviderConnection, { kind: 'claude' }> }
  >();

  const agentRuntimeLabels: Readonly<Record<'codex' | 'claude' | 'opencode', string>> = {
    codex: 'Codex',
    claude: 'Claude',
    opencode: 'OpenCode',
  };

  const runtimeForAgentTarget = (target: IAgentExecutionTarget) =>
    new SynapseAgentRuntime({
      actor: agentRuntimeLabels[target.connection.kind],
      execute: (request) =>
        synapseAi.execute(
          synapseConfigurationForConnection(
            requireAiConnection(
              target.connection.id,
              target.connection.kind,
              target.connection.workspaceId,
            ),
          ),
          { ...request, candidateId: target.routeCandidate.id },
        ),
      ...(target.routeCandidate.model ? { model: openCodeModelForTarget(target) } : {}),
      ...(target.routeCandidate.reasoningEffort
        ? { reasoningEffort: target.routeCandidate.reasoningEffort }
        : {}),
      ...(target.connection.kind === 'claude'
        ? { deniedTools: ['Bash(git commit:*)', 'Bash(git push:*)'] }
        : {}),
    });

  function modelAvailabilityInspectorFor(target: IAgentExecutionTarget) {
    if (!target.routeCandidate.model) return {};
    switch (target.connection.kind) {
      case 'codex':
        return {
          inspectModelAvailability: async (model: string, signal: AbortSignal) => {
            const snapshot = await synapseAi.codexConfiguration(
              synapseConfigurationForConnection(target.connection),
              signal,
            );
            if (snapshot.models.some((candidate) => candidate.id === model)) {
              return { state: 'available' as const };
            }
            return snapshot.models.length
              ? {
                  state: 'unavailable' as const,
                  reason: 'The connected account does not offer this model.',
                }
              : {
                  state: 'unknown' as const,
                  reason: 'The connected account returned no authoritative model list.',
                };
          },
        };
      case 'opencode':
        return {
          inspectModelAvailability: async (model: string, signal: AbortSignal) => {
            const snapshot = await synapseAi.inspect(
              synapseConfigurationForConnection(target.connection),
              signal,
            );
            const models = (snapshot.models ?? []).map((candidate) => candidate.id);
            if (models.includes(model)) return { state: 'available' as const };
            return models.length
              ? {
                  state: 'unavailable' as const,
                  reason: 'The connected account does not offer this model.',
                }
              : {
                  state: 'unknown' as const,
                  reason: 'The connected account returned no authoritative model list.',
                };
          },
        };
      case 'claude':
        return {};
    }
  }

  function openCodeModelForTarget(target: IAgentExecutionTarget): string | undefined {
    const model = target.routeCandidate.model ?? undefined;
    const connection = target.connection;
    return connection.kind === 'opencode' && connection.gateway && model
      ? `${connection.gateway.providerId}/${model.includes('/') ? model.slice(model.indexOf('/') + 1) : model}`
      : model;
  }

  async function readAvailableAiModels(input: {
    readonly runtime: 'opencode';
    readonly workspaceId: string;
    readonly connectionId?: string;
    readonly credentialRef?: string;
    readonly gateway?: {
      readonly providerId: string;
      readonly displayName: string;
      readonly baseUrl: string;
    };
  }) {
    const scopeId = input.connectionId ?? `draft:${input.workspaceId}:opencode`;
    const workspace = settingsState.current.workspaces.find(
      (candidate) => candidate.id === input.workspaceId,
    );
    if (!workspace) throw new Error('The selected workspace is unavailable.');
    const connection = input.connectionId
      ? settingsState.current.connections.find(
          (candidate): candidate is Extract<ProviderConnection, { readonly kind: 'opencode' }> =>
            candidate.id === input.connectionId &&
            candidate.workspaceId === input.workspaceId &&
            candidate.kind === 'opencode',
        )
      : undefined;
    if (input.connectionId && !connection) {
      throw new Error('The selected OpenCode account is unavailable.');
    }
    if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
      return {
        scopeId,
        source: 'cli' as const,
        models: [
          'opencode/deepseek-v4-flash-free',
          'opencode/hy3-free',
          'opencode/laguna-s-2.1-free',
          'opencode/mimo-v2.5-free',
          'opencode/nemotron-3.5-lightning-free',
        ].map(availableAiModelEntry),
      };
    }
    const credentialRef = connection?.credentialRef ?? input.credentialRef;
    const gateway =
      connection?.gateway ??
      (input.gateway ? { ...input.gateway, protocol: 'openai-compatible' as const } : undefined);
    try {
      const snapshot = await synapseAi.inspect(
        synapseConfigurationForConnection(
          connection ?? {
            id: 'draft-model-discovery',
            workspaceId: input.workspaceId,
            kind: 'opencode',
            displayName: 'Draft model discovery',
            ...(credentialRef ? { credentialRef } : {}),
            ...(gateway ? { gateway } : {}),
          },
        ),
        AbortSignal.timeout(12_000),
      );
      const modelIds = (snapshot.models ?? []).map((model) => model.id);
      return {
        scopeId,
        source: 'cli' as const,
        models: modelIds.slice(0, 5_000).map(availableAiModelEntry),
      };
    } catch (cause) {
      return {
        scopeId,
        source: 'cli' as const,
        models: [],
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }

  function availableAiModelEntry(id: string) {
    const providerId = id.includes('/') ? id.slice(0, id.indexOf('/')) : 'default';
    return { id, providerId, displayName: id };
  }

  async function readModelIntelligence(input: {
    readonly targets: readonly {
      readonly model: string;
      readonly reasoningEffort: string | null;
    }[];
  }) {
    if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
      return simulatedModelIntelligence(input);
    }
    const report = await modelIntelligence.scoreModels(input.targets, AbortSignal.timeout(20_000));
    return { ...report, source: 'artificial-analysis' as const };
  }

  function resolveEnvironmentCredential(credentialRef?: string): string | undefined {
    return resolveEnvironmentCredentialBinding(credentialRef)?.value;
  }

  function resolveEnvironmentCredentialBinding(
    credentialRef?: string,
  ): { readonly name: string; readonly value: string } | undefined {
    if (!credentialRef?.startsWith('env:')) return undefined;
    const name = credentialRef.slice(4);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) return undefined;
    const value = process.env[name];
    return value ? { name, value } : undefined;
  }

  function clearAgentAvailabilityForConnection(connectionId: string): void {
    const connection = settingsState.current.connections.find(
      (candidate) => candidate.id === connectionId,
    );
    if (!connection) return;
    agentModelLockout.clearConnection(connection.workspaceId, connection.id);
    agentAccountCooldowns.clearConnection(connection.workspaceId, connection.id);
  }

  function requireAiConnection<TProvider extends 'codex' | 'claude' | 'opencode'>(
    accountId: string,
    provider: TProvider,
    workspaceId?: string,
  ) {
    const connection = settingsState.current.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: TProvider }> =>
        candidate.id === accountId &&
        candidate.kind === provider &&
        (!workspaceId || candidate.workspaceId === workspaceId),
    );
    if (!connection) throw new Error('The selected AI account is unavailable.');
    return connection;
  }

  function synapseConfigurationForConnection(
    connection: Extract<ProviderConnection, { kind: 'codex' | 'claude' | 'opencode' }>,
  ): ISynapseAiInstanceConfiguration {
    const subscriptionSwitch =
      connection.kind === 'claude'
        ? pendingClaudeSubscriptionSwitches.get(claudeSubscriptionSwitchKey(connection))
        : undefined;
    const binding = resolveEnvironmentCredentialBinding(
      subscriptionSwitch && subscriptionSwitch.connection.credentialRef === connection.credentialRef
        ? undefined
        : connection.credentialRef,
    );
    return {
      id: connection.id,
      workspaceId: connection.workspaceId,
      provider: connection.kind,
      root: isolatedRuntimeHome(connection.workspaceId, connection.kind, connection.id),
      ...(process.platform !== 'win32'
        ? { executable: resolveAllowedCommand(connection.kind) }
        : {}),
      environment: {
        PATH: toolchainSearchPath(),
        ...(process.platform === 'darwin' ? { BROWSER: '/usr/bin/true' } : {}),
        ...(connection.kind === 'claude' && binding ? { ANTHROPIC_API_KEY: binding.value } : {}),
        ...(connection.kind === 'opencode' && binding ? { [binding.name]: binding.value } : {}),
      },
      ...(connection.kind === 'opencode'
        ? {
            configuration: {
              deniedCommands: ['git commit*', 'git push*'],
              ...(connection.gateway
                ? {
                    gateway: {
                      ...connection.gateway,
                      ...(binding ? { credentialEnvironmentName: binding.name } : {}),
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
  }

  function claudeSubscriptionSwitchKey(
    connection: Extract<ProviderConnection, { kind: 'claude' }>,
  ): string {
    return JSON.stringify([connection.workspaceId, connection.id]);
  }

  function clearClaudeConnectionCredential(
    connection: Extract<ProviderConnection, { kind: 'claude' }>,
  ): void {
    if (!connection.credentialRef) {
      clearAgentAvailabilityForConnection(connection.id);
      return;
    }
    const matches = (candidate: ProviderConnection): boolean =>
      candidate.id === connection.id &&
      candidate.workspaceId === connection.workspaceId &&
      candidate.kind === 'claude' &&
      candidate.credentialRef === connection.credentialRef;
    if (!settingsState.current.connections.some(matches)) return;
    settingsState.current = settingsState.save({
      ...settingsState.current,
      connections: settingsState.current.connections.map((candidate) =>
        matches(candidate) ? { ...candidate, credentialRef: undefined } : candidate,
      ),
    });
    clearAgentAvailabilityForConnection(connection.id);
  }

  async function readNativeConnectionStatus(): Promise<IProviderConnectionStatus> {
    const codexConnections = settingsState.current.connections.filter(
      (connection) => connection.kind === 'codex',
    );
    const claudeConnections = settingsState.current.connections.filter(
      (connection) => connection.kind === 'claude',
    );
    if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
      return {
        github: { cliAvailable: true, accounts: [] },
        codex: {
          cliAvailable: true,
          accounts: codexConnections.map((connection) => ({
            id: connection.id,
            displayName: connection.displayName,
            authenticated: false,
          })),
        },
        claude: {
          cliAvailable: true,
          accounts: claudeConnections.map((connection) => ({
            id: connection.id,
            displayName: connection.displayName,
            authenticated: false,
          })),
        },
      };
    }
    const [github, codexHealth, claudeHealth] = await Promise.all([
      inspectGitHubConnections(),
      inspectAllowedCommand('codex'),
      inspectAllowedCommand('claude'),
    ]);
    const inspect = async (
      connection: Extract<ProviderConnection, { kind: 'codex' | 'claude' }>,
    ) => {
      try {
        const status = await synapseAi.status(synapseConfigurationForConnection(connection));
        return {
          id: connection.id,
          displayName: connection.displayName,
          authenticated: status.authenticated,
          method: status.method,
        };
      } catch {
        return {
          id: connection.id,
          displayName: connection.displayName,
          authenticated: false,
          error: 'Unable to inspect native AI account authentication.',
        };
      }
    };
    const [codexAccounts, claudeAccounts] = await Promise.all([
      codexHealth.available ? Promise.all(codexConnections.map(inspect)) : Promise.resolve([]),
      claudeHealth.available ? Promise.all(claudeConnections.map(inspect)) : Promise.resolve([]),
    ]);
    return {
      github,
      codex: {
        cliAvailable: codexHealth.available,
        ...(codexHealth.version ? { version: codexHealth.version } : {}),
        accounts: codexAccounts.map(
          (account): IProviderConnectionStatus['codex']['accounts'][number] => ({
            ...account,
            method:
              account.method === 'chatgpt'
                ? 'chatgpt'
                : account.method === 'api-key'
                  ? 'api-key'
                  : 'unknown',
          }),
        ),
      },
      claude: {
        cliAvailable: claudeHealth.available,
        ...(claudeHealth.version ? { version: claudeHealth.version } : {}),
        accounts: claudeAccounts.map(
          (account): IProviderConnectionStatus['claude']['accounts'][number] => ({
            ...account,
            method:
              account.method === 'subscription'
                ? 'subscription'
                : account.method === 'api-key'
                  ? 'api-key'
                  : 'unknown',
          }),
        ),
      },
    };
  }
  const targets: IWorkspaceAgentRuntimeOptions['targets'] = (role, workspaceId, executionBinding) =>
    agentExecutionTargetsFor(
      settingsState.current,
      role,
      workspaceId,
      executionBinding?.agentTeamId,
    ).map((target) => ({
      label: `${target.agent.displayName} via ${target.connection.displayName}`,
      actor: agentRuntimeLabels[target.connection.kind],
      runtime: runtimeForAgentTarget(target),
      executionBinding: {
        agentTeamId: target.team.id,
        positionId: target.position.id,
        agentRoutePolicyId: target.routePolicy.id,
        agentRouteCandidateId: target.routeCandidate.id,
        aiConnectionId: target.connection.id,
        agentProfileId: target.agent.id,
        model: target.routeCandidate.model,
        reasoningEffort: target.routeCandidate.reasoningEffort,
      },
      routing: {
        workspaceId: target.team.workspaceId,
        agentProfileId: target.agent.id,
        routePolicyId: target.routePolicy.id,
        routeCandidateId: target.routeCandidate.id,
        providerId: target.routeCandidate.providerId ?? target.connection.kind,
        strategy: target.routePolicy.strategy,
        costClass: target.routeCandidate.costClass,
        qualityScore: target.routeCandidate.qualityScore ?? 50,
        priority: target.routeCandidate.priority,
        sessionAffinity: target.routePolicy.sessionAffinity,
        maxParallelExecutions: target.routePolicy.maxParallelExecutions,
      },
      ...modelAvailabilityInspectorFor(target),
    }));
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'codex.configuration.get',
      aiRequestSchemas['codex.configuration.get'],
      aiResponseSchemas['codex.configuration.get'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedCodexConfiguration();
        }
        const connection = requireAiConnection(input.accountId, 'codex');
        clearAgentAvailabilityForConnection(input.accountId);
        return synapseAi.codexConfiguration(synapseConfigurationForConnection(connection));
      },
    ),
    createOrchestratorRequestHandler(
      'ai.models.get',
      aiRequestSchemas['ai.models.get'],
      aiResponseSchemas['ai.models.get'],
      async (input) => {
        return readAvailableAiModels(input);
      },
    ),
    createOrchestratorRequestHandler(
      'ai.intelligence.get',
      aiRequestSchemas['ai.intelligence.get'],
      aiResponseSchemas['ai.intelligence.get'],
      async (input) => {
        return readModelIntelligence(input);
      },
    ),
    createOrchestratorRequestHandler(
      'opencode.credentials.import',
      aiRequestSchemas['opencode.credentials.import'],
      aiResponseSchemas['opencode.credentials.import'],
      async (input) => {
        const connection = settingsState.current.connections.find(
          (candidate): candidate is Extract<ProviderConnection, { readonly kind: 'opencode' }> =>
            candidate.id === input.accountId && candidate.kind === 'opencode',
        );
        if (!connection) throw new Error('The selected OpenCode account is unavailable.');
        if (process.env['SYMPHONY_CONNECTION_MODE'] !== 'simulated') {
          await synapseAi.importOpenCodeCredentials(
            synapseConfigurationForConnection(connection),
            join(
              process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local', 'share'),
              'opencode',
              'auth.json',
            ),
          );
        }
        clearAgentAvailabilityForConnection(connection.id);
        return {
          status: 'completed' as const,
          message: 'OpenCode provider sign-ins were imported into this workspace account.',
        };
      },
    ),
    createOrchestratorRequestHandler(
      'codex.login.start',
      aiRequestSchemas['codex.login.start'],
      aiResponseSchemas['codex.login.start'],
      async (input) => {
        const connection = requireAiConnection(input.accountId, 'codex');
        if (input.mode === 'chatgpt') {
          if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
            return {
              status: 'started',
              message: 'ChatGPT sign-in opened in your browser.',
              authorizationUrl: 'https://auth.openai.com/oauth/authorize?state=symphony-e2e',
            };
          }
          const authorizationUrl = await synapseAi.startBrowserLogin(
            synapseConfigurationForConnection(connection),
            'chatgpt-browser',
          );
          return {
            status: 'started',
            message:
              'ChatGPT sign-in opened in your browser. Complete it there, then refresh status.',
            authorizationUrl,
          };
        }
        if (process.env['SYMPHONY_CONNECTION_MODE'] !== 'simulated') {
          await synapseAi.loginWithCredential(
            synapseConfigurationForConnection(connection),
            'api-key',
            'apiKey',
            input.apiKey,
          );
        }
        clearAgentAvailabilityForConnection(input.accountId);
        return { status: 'completed', message: 'Codex API-key login completed.' };
      },
    ),
    createOrchestratorRequestHandler(
      'codex.logout',
      aiRequestSchemas['codex.logout'],
      aiResponseSchemas['codex.logout'],
      async (input) => {
        const connection = requireAiConnection(input.accountId, 'codex');
        if (process.env['SYMPHONY_CONNECTION_MODE'] !== 'simulated')
          await synapseAi.logout(synapseConfigurationForConnection(connection));
        clearAgentAvailabilityForConnection(input.accountId);
        return { status: 'completed', message: 'Codex account disconnected.' };
      },
    ),
    createOrchestratorRequestHandler(
      'claude.login.start',
      aiRequestSchemas['claude.login.start'],
      aiResponseSchemas['claude.login.start'],
      async (input) => {
        const connection = requireAiConnection(input.accountId, 'claude');
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return {
            status: 'started',
            message: 'Claude sign-in opened in your browser.',
            authorizationUrl: 'https://claude.com/cai/oauth/authorize?state=symphony-e2e',
          };
        }
        const key = claudeSubscriptionSwitchKey(connection);
        const pending = { connection };
        pendingClaudeSubscriptionSwitches.set(key, pending);
        const configuration = synapseConfigurationForConnection({
          ...connection,
          credentialRef: undefined,
        });
        try {
          const authorizationUrl = await synapseAi.startBrowserLogin(configuration, 'subscription');
          void synapseAi
            .waitForLogin(configuration)
            .then(
              () => {
                if (pendingClaudeSubscriptionSwitches.get(key) === pending)
                  clearClaudeConnectionCredential(connection);
              },
              () => undefined,
            )
            .catch(() => {
              logger.error({ event: 'claude.subscription-switch.persist-failed' });
            })
            .finally(() => {
              if (pendingClaudeSubscriptionSwitches.get(key) === pending)
                pendingClaudeSubscriptionSwitches.delete(key);
            });
          return {
            status: 'started',
            message: 'Claude sign-in opened. Paste the authorization code to finish connecting.',
            authorizationUrl,
          };
        } catch (cause) {
          if (pendingClaudeSubscriptionSwitches.get(key) === pending)
            pendingClaudeSubscriptionSwitches.delete(key);
          throw cause;
        }
      },
    ),
    createOrchestratorRequestHandler(
      'claude.login.complete',
      aiRequestSchemas['claude.login.complete'],
      aiResponseSchemas['claude.login.complete'],
      async (input) => {
        const connection = requireAiConnection(input.accountId, 'claude');
        if (process.env['SYMPHONY_CONNECTION_MODE'] !== 'simulated') {
          await synapseAi.completeLogin(
            synapseConfigurationForConnection({ ...connection, credentialRef: undefined }),
            'authorizationCode',
            input.authorizationCode,
          );
        }
        clearClaudeConnectionCredential(connection);
        clearAgentAvailabilityForConnection(input.accountId);
        return { status: 'completed', message: 'Claude account connected to this workspace.' };
      },
    ),
    createOrchestratorRequestHandler(
      'claude.logout',
      aiRequestSchemas['claude.logout'],
      aiResponseSchemas['claude.logout'],
      async (input) => {
        const connection = requireAiConnection(input.accountId, 'claude');
        if (process.env['SYMPHONY_CONNECTION_MODE'] !== 'simulated')
          await synapseAi.logout(
            synapseConfigurationForConnection({ ...connection, credentialRef: undefined }),
          );
        clearClaudeConnectionCredential(connection);
        clearAgentAvailabilityForConnection(input.accountId);
        return { status: 'completed', message: 'Claude account disconnected.' };
      },
    ),
  ]);
  return Object.freeze({
    targets,
    id: 'ai',
    handlers,
    runtimeForAgentTarget,
    modelAvailabilityInspectorFor,
    resolveEnvironmentCredential,
    readNativeConnectionStatus,
  });
}
