// #region Imports
import { type ICiRun, type ILocalCiExecution } from '@symphony/domain-ci';
import { randomUUID } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { type IRepositoryBinding } from '@symphony/domain-workspace';
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { type IRunnerImageDefinition } from '@symphony/domain-core';
import {
  type LocalCiInstanceDto,
  ciRequestSchemas,
  ciResponseSchemas,
} from '@symphony/ipc-contracts-ci';
import { allocatedDirectoryBytes } from '../../storage-governor';
import { limaInstanceName } from '@symphony/providers-lima';
import { arch as architecture } from 'node:os';
import { type ICreateManagedLocalCiRequestsDependencies } from './ICreateManagedLocalCiRequestsDependencies';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
import { type IActiveLocalCiRun } from './IActiveLocalCiRun';
// #endregion

/**
 * Owns localCi commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createManagedLocalCiRequests(
  dependencies: ICreateManagedLocalCiRequestsDependencies,
) {
  const {
    logger,
    storageGovernor,
    github,
    settingsState,
    localCiRepository,
    configurationRoot,
    managedLocalCiRunner,
    runnerImageCatalog,
    simulatedContinuousIntegration,
    simulatedWorkflowDispatch,
  } = dependencies;
  const activeLocalCiRuns = new Map<
    string,
    {
      readonly controller: AbortController;
      readonly completion: Promise<unknown>;
      readonly startedAt: string;
    }
  >();

  const localCiSetupDiagnostics = new Map<string, string>();

  let pendingLocalCiWorkflowDispatches = 0;

  let localCiCleanupOperation:
    | Promise<{
        readonly removedInstances: number;
        readonly failedInstances: number;
        readonly removedConfigurationFiles: number;
      }>
    | undefined;

  async function prepareLocalCiRuntime(): Promise<void> {
    await migrateLegacyLocalCiRuntime();
    const cleanup = await cleanupManagedLocalCiInstances();
    if (cleanup.removedInstances || cleanup.removedConfigurationFiles || cleanup.failedInstances) {
      logger.info({ event: 'local-ci.stale-instances.cleaned', ...cleanup });
    }
  }

  async function startLocalCiRun(
    run: Pick<ICiRun, 'id' | 'runAttempt'>,
  ): Promise<ILocalCiExecution> {
    storageGovernor.assertWritable({ workload: 'local-ci' });
    assertLocalCiEnabled(github.runWorkspaceId(run.id));
    if (activeLocalCiRuns.size) {
      throw new Error('Another GitHub Actions workflow is already running locally.');
    }
    const controller = new AbortController();
    const startedAt = new Date().toISOString();
    const executionId = `local-ci-${randomUUID()}`;
    localCiSetupDiagnostics.set(
      run.id,
      'Phase: Cleaning abandoned local runner instances\nRunner: not started yet',
    );
    const completion = (async () => {
      try {
        const cleanup = await cleanupManagedLocalCiInstances();
        if (cleanup.failedInstances) {
          throw new Error('An abandoned local CI instance could not be removed.');
        }
        if (controller.signal.aborted) {
          throw new Error('The local CI run was cancelled before runner startup.');
        }
        localCiSetupDiagnostics.delete(run.id);
        return await github.runLocally(
          run.id,
          executionId,
          localCiRuntimeRoot(),
          controller.signal,
        );
      } catch (cause) {
        if (!localCiSetupDiagnostics.has(run.id)) throw cause;
        localCiSetupDiagnostics.set(
          run.id,
          `Phase: Local runner setup failed\nError: ${cause instanceof Error ? cause.message : 'Unknown local runner error'}`,
        );
        throw cause;
      }
    })();
    activeLocalCiRuns.set(run.id, {
      controller,
      completion,
      startedAt,
    });
    try {
      let execution: ILocalCiExecution;
      try {
        execution = await completion;
      } catch (cause) {
        const binding = settingsState.current.ciBindings.find((candidate) =>
          run.id.startsWith(`${candidate.id}:`),
        );
        if (!binding) throw cause;
        const details = await github.getRunDetails(run.id).catch(() => undefined);
        const message = cause instanceof Error ? cause.message : 'Unknown local runner error';
        const state: ILocalCiExecution['state'] = controller.signal.aborted
          ? 'cancelled'
          : 'failed';
        const localDiagnostics = details?.localDiagnostics ?? localCiSetupDiagnostics.get(run.id);
        execution = {
          id: executionId,
          workspaceId: binding.workspaceId,
          repositoryBindingId: binding.repositoryBindingId,
          ciRunId: run.id,
          ...(run.runAttempt ? { runAttempt: run.runAttempt } : {}),
          state,
          startedAt,
          finishedAt: new Date().toISOString(),
          ...(state === 'failed'
            ? { failureLog: (details?.failureLog ?? message).slice(-64_000) }
            : {}),
          ...(localDiagnostics ? { localDiagnostics: localDiagnostics.slice(-64_000) } : {}),
        };
      }
      localCiRepository.saveLocalCiExecution(execution);
      localCiSetupDiagnostics.delete(run.id);
      return execution;
    } finally {
      if (activeLocalCiRuns.get(run.id)?.controller === controller) {
        activeLocalCiRuns.delete(run.id);
      }
    }
  }

  async function migrateLegacyLocalCiRuntime(): Promise<void> {
    const legacyRoot = join(configurationRoot, 'local-ci');
    const runtimeRoot = localCiRuntimeRoot();
    if (resolve(legacyRoot) === resolve(runtimeRoot) || !existsSync(legacyRoot)) return;
    mkdirSync(dirname(runtimeRoot), { recursive: true, mode: 0o700 });
    const cleanup = await managedLocalCiRunner.cleanup(legacyRoot, new AbortController().signal);
    if (cleanup.failedInstances) {
      logger.error({ event: 'local-ci.legacy-runtime.cleanup.failed', ...cleanup });
      return;
    }
    if (!existsSync(runtimeRoot)) {
      try {
        renameSync(legacyRoot, runtimeRoot);
        logger.info({ event: 'local-ci.runtime.migrated', runtimeRoot });
        return;
      } catch {
        // A cross-device workspace root cannot use an atomic cache migration.
      }
    }
    rmSync(legacyRoot, { recursive: true, force: true });
  }

  function localCiRuntimeRoot(): string {
    return join(settingsState.current.runtime.workspaceRoot, 'local-ci');
  }

  function runnerImageCacheRoot(): string {
    return join(localCiRuntimeRoot(), 'cache');
  }

  function requireRepositoryBinding(repositoryBindingId: string): IRepositoryBinding {
    const binding = settingsState.current.repositoryBindings.find(
      (candidate) => candidate.id === repositoryBindingId,
    );
    if (!binding) throw new Error(`Unknown repository binding: ${repositoryBindingId}`);
    if (!binding.enabled) {
      throw new Error(`The repository ${binding.displayName} is disabled for managed execution.`);
    }
    return binding;
  }

  function assertLocalCiEnabled(workspaceId: string | undefined): void {
    if (workspaceId === undefined) {
      // The target is unknown, so the only decidable question is whether any workspace runs
      // locally at all. When none does, the capability is off and says so instead of failing later.
      if (settingsState.current.workspaces.some((workspace) => workspace.localCiEnabled)) return;
      throw new Error(
        'Enable local GitHub Actions for a workspace in its settings before starting a local run.',
      );
    }
    const workspace = settingsState.current.workspaces.find(
      (candidate) => candidate.id === workspaceId,
    );
    if (!workspace) throw new Error(`Unknown workspace: ${workspaceId}`);
    if (!workspace.localCiEnabled) {
      throw new Error(
        `Enable local GitHub Actions for ${workspace.displayName} in its workspace settings before starting a local run.`,
      );
    }
  }

  function localCiEnabledWorkspaceIds(source: IApplicationSettings): string {
    return source.workspaces
      .filter((workspace) => workspace.localCiEnabled)
      .map((workspace) => workspace.id)
      .toSorted()
      .join(',');
  }

  async function resolveManagedGuest(
    repositoryBindingId: string,
    signal: AbortSignal,
  ): Promise<{
    readonly image: IRunnerImageDefinition;
    readonly setupScript?: string;
    readonly reuse?: boolean;
    readonly warmInstanceKey?: string;
  }> {
    const binding = requireRepositoryBinding(repositoryBindingId);
    const workspace = settingsState.current.workspaces.find(
      (candidate) => candidate.id === binding.workspaceId,
    );
    if (!workspace) throw new Error(`Unknown workspace: ${binding.workspaceId}`);
    assertLocalCiEnabled(workspace.id);
    const image = workspace.localCiImage ?? (await pinLatestRunnerImage(workspace.id, signal));
    return {
      image,
      ...(binding.localCiSetupScript?.trim() ? { setupScript: binding.localCiSetupScript } : {}),
      ...(settingsState.current.localCi.reuseVirtualMachine
        ? { reuse: true, warmInstanceKey: warmInstanceKey(binding.id) }
        : {}),
    };
  }

  function warmInstanceKey(repositoryBindingId: string): string {
    return `symphony-warm:${repositoryBindingId}`;
  }

  async function describeManagedLocalCiInstances(): Promise<readonly LocalCiInstanceDto[]> {
    const runtimeRoot = localCiRuntimeRoot();
    const preserved = new Set(preservedWarmInstances());
    const described = await managedLocalCiRunner.instances(
      runtimeRoot,
      new AbortController().signal,
    );
    return described.map((instance) => ({
      ...instance,
      allocatedBytes: allocatedDirectoryBytes([join(runtimeRoot, 'lima', instance.name)]),
      keptWarm: preserved.has(instance.name),
      busy: activeLocalCiRuns.size > 0,
    }));
  }

  function preservedWarmInstances(): readonly string[] {
    if (!settingsState.current.localCi.reuseVirtualMachine) return [];
    return settingsState.current.repositoryBindings.map((binding) =>
      limaInstanceName('sci', warmInstanceKey(binding.id)),
    );
  }

  async function pinLatestRunnerImage(
    workspaceId: string,
    signal: AbortSignal,
  ): Promise<IRunnerImageDefinition> {
    const architecture = managedLocalCiArchitecture();
    const catalog = await runnerImageCatalog.catalog(runnerImageCacheRoot(), signal);
    const entry = catalog.entries.find(
      (candidate) => candidate.latest && candidate.architecture === architecture,
    );
    if (!entry) {
      throw new Error(
        `No GitHub runner image release is published for ${architecture}. Select an image in Settings.`,
      );
    }
    return selectRunnerImage(workspaceId, entry.releaseTag, signal);
  }

  async function selectRunnerImage(
    workspaceId: string,
    releaseTag: string,
    signal: AbortSignal,
  ): Promise<IRunnerImageDefinition> {
    const catalog = await runnerImageCatalog.catalog(runnerImageCacheRoot(), signal);
    const entry = catalog.entries.find((candidate) => candidate.releaseTag === releaseTag);
    if (!entry) throw new Error(`Unknown runner image release: ${releaseTag}`);
    const definition = await runnerImageCatalog.resolveDefinition(entry, signal);
    settingsState.current = settingsState.save({
      ...settingsState.current,
      workspaces: settingsState.current.workspaces.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, localCiImage: definition } : workspace,
      ),
    });
    logger.info({
      event: 'local-ci.runner-image.pinned',
      workspaceId,
      releaseTag,
      ubuntuVersion: definition.ubuntuVersion,
      packages: definition.aptPackages.length,
      nodeVersion: definition.nodeVersion,
    });
    return definition;
  }

  function managedLocalCiArchitecture(): 'arm64' | 'x64' {
    return architecture() === 'arm64' ? 'arm64' : 'x64';
  }

  function cleanupManagedLocalCiInstances(): Promise<{
    readonly removedInstances: number;
    readonly failedInstances: number;
    readonly removedConfigurationFiles: number;
  }> {
    if (localCiCleanupOperation) return localCiCleanupOperation;
    const operation = managedLocalCiRunner
      .cleanup(localCiRuntimeRoot(), new AbortController().signal, preservedWarmInstances())
      .finally(() => {
        if (localCiCleanupOperation === operation) localCiCleanupOperation = undefined;
      });
    localCiCleanupOperation = operation;
    return operation;
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'ci.workflow.local.run',
      ciRequestSchemas['ci.workflow.local.run'],
      ciResponseSchemas['ci.workflow.local.run'],
      async (input) => {
        storageGovernor.assertWritable({ workload: 'local-ci' });
        assertLocalCiEnabled(
          process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated'
            ? simulatedContinuousIntegration().ciWorkflows.find(
                (candidate) => candidate.id === input.workflowId,
              )?.workspaceId
            : await github.workflowWorkspaceId(input.workflowId),
        );
        if (activeLocalCiRuns.size) {
          throw new Error('Another GitHub Actions workflow is already running locally.');
        }
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          const run = simulatedWorkflowDispatch(input.workflowId, input.ref);
          const now = new Date().toISOString();
          const execution = {
            id: `local-ci-${randomUUID()}`,
            workspaceId: run.workspaceId,
            repositoryBindingId: run.repositoryBindingId,
            ciRunId: run.id,
            state: 'succeeded' as const,
            startedAt: now,
            finishedAt: now,
            runner: {
              kind: 'managed-linux-vm' as const,
              os: 'linux' as const,
              architecture: 'arm64' as const,
              label: `symphony-run-${run.id.split(':').at(-1)}`,
              imageVersion: 'simulated',
            },
          };
          localCiRepository.saveLocalCiExecution(execution);
          return execution;
        }
        pendingLocalCiWorkflowDispatches += 1;
        try {
          const run = await github.dispatchWorkflow(input.workflowId, input.ref, { local: true });
          return await startLocalCiRun(run);
        } finally {
          pendingLocalCiWorkflowDispatches -= 1;
        }
      },
    ),
    createOrchestratorRequestHandler(
      'ci.local.run',
      ciRequestSchemas['ci.local.run'],
      ciResponseSchemas['ci.local.run'],
      async (input) => {
        return startLocalCiRun({ id: input.runId });
      },
    ),
    createOrchestratorRequestHandler(
      'ci.local.cancel',
      ciRequestSchemas['ci.local.cancel'],
      ciResponseSchemas['ci.local.cancel'],
      async (input) => {
        activeLocalCiRuns.get(input.runId)?.controller.abort();
        return { completed: true as const };
      },
    ),
    createOrchestratorRequestHandler(
      'ci.local.cleanup',
      ciRequestSchemas['ci.local.cleanup'],
      ciResponseSchemas['ci.local.cleanup'],
      async () => {
        if (activeLocalCiRuns.size) {
          throw new Error('Stop the active local CI run before clearing runner data.');
        }
        const runtimeRoot = localCiRuntimeRoot();
        const result = await cleanupManagedLocalCiInstances();
        if (result.failedInstances) {
          throw new Error('One or more local CI instances could not be removed.');
        }
        rmSync(runtimeRoot, { recursive: true, force: true });
        storageGovernor.invalidate();
        return {
          removedInstances: result.removedInstances,
          removedConfigurationFiles: result.removedConfigurationFiles,
          cacheCleared: true as const,
        };
      },
    ),
    createOrchestratorRequestHandler(
      'local-ci.instances.list',
      ciRequestSchemas['local-ci.instances.list'],
      ciResponseSchemas['local-ci.instances.list'],
      async () => {
        return {
          runtimeRoot: localCiRuntimeRoot(),
          instances: await describeManagedLocalCiInstances(),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'local-ci.instances.remove',
      ciRequestSchemas['local-ci.instances.remove'],
      ciResponseSchemas['local-ci.instances.remove'],
      async (input) => {
        const instances = await describeManagedLocalCiInstances();
        const target = instances.find((instance) => instance.name === input.name);
        if (!target) throw new Error('That machine no longer exists.');
        if (target.busy) {
          throw new Error('Stop the run using this machine before removing it.');
        }
        const removed = await managedLocalCiRunner.removeInstance(
          localCiRuntimeRoot(),
          target.name,
          new AbortController().signal,
        );
        if (!removed)
          throw new Error('The machine could not be removed. Its disk is still in use.');
        storageGovernor.invalidate();
        return { removed, instances: await describeManagedLocalCiInstances() };
      },
    ),
    createOrchestratorRequestHandler(
      'local-ci.images.list',
      ciRequestSchemas['local-ci.images.list'],
      ciResponseSchemas['local-ci.images.list'],
      async (input) => {
        const catalog = await runnerImageCatalog.catalog(
          runnerImageCacheRoot(),
          new AbortController().signal,
          input.refresh,
        );
        const architecture = managedLocalCiArchitecture();
        return {
          architecture,
          entries: catalog.entries.filter((entry) => entry.architecture === architecture),
          refreshedAt: catalog.refreshedAt,
          ...(catalog.staleReason ? { staleReason: catalog.staleReason } : {}),
          selections: settingsState.current.workspaces.map((workspace) => ({
            workspaceId: workspace.id,
            ...(workspace.localCiImage ? { image: workspace.localCiImage } : {}),
          })),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'local-ci.image.select',
      ciRequestSchemas['local-ci.image.select'],
      ciResponseSchemas['local-ci.image.select'],
      async (input) => {
        if (activeLocalCiRuns.size) {
          throw new Error('Stop the active managed run before changing the guest image.');
        }
        const image = await selectRunnerImage(
          input.workspaceId,
          input.releaseTag,
          new AbortController().signal,
        );
        return { workspaceId: input.workspaceId, image };
      },
    ),
  ]);
  return Object.freeze({
    handlers,
    prepareLocalCiRuntime,
    startLocalCiRun,
    localCiEnabledWorkspaceIds,
    resolveManagedGuest,
    activeRuns: (): ReadonlyMap<string, IActiveLocalCiRun> => activeLocalCiRuns,
    diagnostics: (): ReadonlyMap<string, string> => localCiSetupDiagnostics,
    busy: (): boolean => activeLocalCiRuns.size > 0 || pendingLocalCiWorkflowDispatches > 0,
  });
}
