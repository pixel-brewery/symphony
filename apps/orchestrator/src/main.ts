// #region Imports
import { externalWriteOperationSchema } from '@symphony/ipc-contracts-ci';
import { deliveryOperationSchema } from '@symphony/ipc-contracts-delivery';
import {
  CiRunHistoryService,
  ExternalWriteService,
  ContinuousIntegrationProjectionService,
} from '@symphony/application-ci';
import {
  DeliveryService,
  PullRequestProjectionService,
  type IPullRequestCollectionPort,
} from '@symphony/application-delivery';
import { WorkItemService, WorkTrackingProjectionService } from '@symphony/application-work';
import {
  JsonDeliveryOperationRepository,
  SqlitePullRequestProjectionRepository,
} from '@symphony/persistence-delivery';
import {
  JsonExternalWriteRepository,
  SqliteContinuousIntegrationProjectionRepository,
} from '@symphony/persistence-ci';
import { SqliteWorkTrackingProjectionRepository } from '@symphony/persistence-work';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, hostname, tmpdir } from 'node:os';
import { AnalyzerService, WorkItemRelationAssessor } from '@symphony/application-execution';
import { RemoteProjectionService } from '@symphony/application-composition';
import { AutomationService } from '@symphony/application-automation';
import { FeedbackIntakeService } from '@symphony/application-feedback';
import { MobileAccessService } from '@symphony/application-mobile';
import { RemoteProviderRateLimitError } from '@symphony/application-core';
import { RepositoryRuntimeService } from '@symphony/application-workspace';
import {
  WorkflowEngineService,
  WorkflowMaintenanceService,
  WorkflowStageHistoryService,
  type IWorkflowReporter,
} from '@symphony/application-workflow';
import {
  createDefaultApplicationSettings,
  agentTeamFor,
  primaryWorkspace,
  repositoryBindingsFor,
  upgradeApplicationSettings,
  type IApplicationSettings,
  type ProviderConnection,
} from '@symphony/configuration-composition';
import { bootstrapConfig } from '@symphony/configuration-core';
import { type IRuntimeHealth } from '@symphony/domain-platform';
import { type IWorkItem } from '@symphony/domain-work';
import { internalCredentialMessageSchema } from '@symphony/ipc-contracts-core';
import {
  JsonSettingsRepository,
  SqliteRemoteProjectionCache,
} from '@symphony/persistence-platform';
import { JsonWorkspaceBundleRepository } from '@symphony/persistence-workspace';
import { JsonMobileAccessRepository } from '@symphony/persistence-mobile';
import {
  WorkspaceAgentRouteTelemetryRepository,
  agentRouteTelemetrySchema,
} from '@symphony/persistence-ai';
import {
  SqliteOperationalRepositories,
  WorkspaceOperationalRepositories,
  WorkspaceRuntimeRepositories,
} from '@symphony/persistence-composition';
import {
  SqliteDatabase,
  WorkspaceDatabaseRegistry,
  workspaceStorageDirectoryName,
} from '@symphony/persistence-core';
import { StructuredLogger } from '@symphony/logging';
import { toolchainCacheEnvironment } from '@symphony/providers-core';
import {
  GitHubCloudProvider,
  GitHubProjectTracker,
  GitHubRequestGovernor,
  GitHubServiceStatusProvider,
  readGitHubToken,
} from '@symphony/providers-github';
import {
  SynapseAiService,
  AgentAccountCooldowns,
  AgentModelLockout,
  AgentRouteGovernor,
} from '@symphony/providers-synapse';
import { ArtificialAnalysisModelIntelligence } from '@symphony/providers-artificial-analysis';
import { AzureDevOpsWorkTracker } from '@symphony/providers-azure-devops';
import { MicrosoftTeamsFeedbackIntake } from '@symphony/providers-microsoft-teams';
import { GitWorktreeWorkspace, ManagedGitRepository } from '@symphony/providers-git';
import {
  LocalVerificationExecutor,
  RunnerImageCatalogService,
  ManifestVerificationPlanner,
} from '@symphony/providers-ci';
import { ManagedLimaGithubRunner } from '@symphony/providers-lima';
import {
  SimulatedAgentRuntime,
  SimulatedPullRequestDelivery,
  SimulatedRepositoryAcquisition,
  SimulatedTracker,
  SimulatedWorkspace,
  SimulatedProjectQueries,
  SimulatedPullRequestAuthoring,
  SimulatedCiQueries,
} from '@symphony/providers-simulated';
import { WorkspaceAgentRuntime } from '@symphony/providers-ai';
import { WorkTrackerRouter } from '@symphony/providers-work';
import { builtinSkill } from '@symphony/domain-skills';
import { SkillCatalogService } from '@symphony/application-skills';
import { SkillPackageService, sha256SkillText } from '@symphony/providers-filesystem';
import { StorageGovernor } from './storage-governor';
import { AzureDevOpsCredentialBroker } from './AzureDevOpsCredentialBroker';
import { LocalCiTakeoverService } from './local-ci-takeover/LocalCiTakeoverService';
import { OrchestrationSnapshotService } from './snapshot/OrchestrationSnapshotService';
import { createWorkspacePaths } from './features/workspace/createWorkspacePaths';
import { createAiProfilePaths } from './features/ai/createAiProfilePaths';
import { createRemoteProjectionScope } from './composition/createRemoteProjectionScope';
import { createExecutionBindings } from './features/execution/createExecutionBindings';
import { provideExecutionOrchestratorFeature } from './features/execution/provideExecutionOrchestratorFeature';
import { provideWorkOrchestratorFeature } from './features/work/provideWorkOrchestratorFeature';
import { provideDeliveryOrchestratorFeature } from './features/delivery/provideDeliveryOrchestratorFeature';
import { createVerificationRequests } from './features/ci/createVerificationRequests';
import { createManagedLocalCiRequests } from './features/ci/createManagedLocalCiRequests';
import { provideCiOrchestratorFeature } from './features/ci/provideCiOrchestratorFeature';
import { provideAutomationOrchestratorFeature } from './features/automation/provideAutomationOrchestratorFeature';
import { provideFeedbackOrchestratorFeature } from './features/feedback/provideFeedbackOrchestratorFeature';
import { createFeedbackSynchronizationCoordinator } from './features/feedback/createFeedbackSynchronizationCoordinator';
import { provideWorkflowOrchestratorFeature } from './features/workflow/provideWorkflowOrchestratorFeature';
import { provideSkillsOrchestratorFeature } from './features/skills/provideSkillsOrchestratorFeature';
import { provideMobileOrchestratorFeature } from './features/mobile/provideMobileOrchestratorFeature';
import { createMobileGateway } from './features/mobile/createMobileGateway';
import { createRepositorySkillRootReader } from './features/skills/createRepositorySkillRootReader';
import { createGitHubConnectionTokenReader } from './features/platform/createGitHubConnectionTokenReader';
import { createExecutionEventPublisher } from './composition/createExecutionEventPublisher';
import { createWorkspaceDeletionCoordinator } from './composition/createWorkspaceDeletionCoordinator';
import { provideWorkspaceOrchestratorFeature } from './features/workspace/provideWorkspaceOrchestratorFeature';
import { provideAiOrchestratorFeature } from './features/ai/provideAiOrchestratorFeature';
import { providePlatformOrchestratorFeature } from './features/platform/providePlatformOrchestratorFeature';
import { createLifecycleRequests } from './composition/createLifecycleRequests';
import { createSettingsRequests } from './composition/createSettingsRequests';
import { provideCompositionOrchestratorFeature } from './composition/provideCompositionOrchestratorFeature';
import { createStorageSafetyCoordinator } from './composition/createStorageSafetyCoordinator';
import { createBackgroundCoordinator } from './composition/createBackgroundCoordinator';
import { createCredentialBridge } from './composition/createCredentialBridge';
import { OrchestratorSettingsState } from './composition/OrchestratorSettingsState';
import { type OrchestratorCatalog } from './composition/OrchestratorCatalog';
import { type IUtilityParentPort } from './composition/IUtilityParentPort';
import { readRuntimeHealth } from './features/platform/readRuntimeHealth';
import { createNativeAiShutdown } from './composition/createNativeAiShutdown';
import { orchestratorFeatureMethods } from './composition/OrchestratorFeatureMethods';
import { OrchestratorRequestRegistry } from './transport/OrchestratorRequestRegistry';
import { OrchestratorRequestProcessor } from './transport/OrchestratorRequestProcessor';
import { createImplementationVerification } from './features/execution/createImplementationVerification';
import { createWorkItemWorkingDirectory } from './features/work/createWorkItemWorkingDirectory';
// #endregion

const parentPort = (process as NodeJS.Process & { parentPort?: IUtilityParentPort }).parentPort;

const logger = new StructuredLogger('orchestrator');

process.umask(0o077);

const databasePath =
  process.env['SYMPHONY_DATABASE_PATH'] ?? join(tmpdir(), 'local-orchestration.sqlite');

const configurationRoot =
  process.env['SYMPHONY_CONFIG_ROOT'] ??
  (process.env['SYMPHONY_DATABASE_PATH'] ? dirname(databasePath) : join(tmpdir(), 'symphony'));

const toolchainCacheRoot = join(configurationRoot, 'toolchain-cache');

const synapseAi = new SynapseAiService({
  profileStoreRoot: join(configurationRoot, 'ai-profiles'),
  environment: Object.fromEntries(
    Object.entries(toolchainCacheEnvironment(toolchainCacheRoot)).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  ),
});

const stopNativeAi = createNativeAiShutdown(synapseAi);

process.once('SIGTERM', stopNativeAi);

process.once('SIGINT', stopNativeAi);

const settingsPath =
  process.env['SYMPHONY_SETTINGS_PATH'] ?? join(configurationRoot, 'settings.json');

const machineSettingsPath =
  process.env['SYMPHONY_MACHINE_SETTINGS_PATH'] ?? join(configurationRoot, 'machine.json');

const mobileAccessPath =
  process.env['SYMPHONY_MOBILE_ACCESS_PATH'] ?? join(configurationRoot, 'mobile-access.json');

mkdirSync(dirname(databasePath), { recursive: true });

const settingsRepository = new JsonSettingsRepository(settingsPath, machineSettingsPath);

settingsRepository.initialize();

const workspaceBundles = new JsonWorkspaceBundleRepository();

const mobileAccessRepository = new JsonMobileAccessRepository(mobileAccessPath);

mobileAccessRepository.initialize();

const mobileAccess = new MobileAccessService({
  repository: mobileAccessRepository,
  security: {
    randomToken: () => randomBytes(32).toString('base64url'),
    hash: (value) => createHash('sha256').update(value).digest('hex'),
  },
  now: () => new Date(),
});

const generatedDefaults = createDefaultApplicationSettings(homedir());

const defaultSettings: IApplicationSettings = {
  ...generatedDefaults,
  runtime: { ...generatedDefaults.runtime, workspaceRoot: join(configurationRoot, 'workspaces') },
};

const skillPackageStorage = new SkillPackageService(
  process.env['SYMPHONY_USER_SKILLS_PATH'] ?? join(configurationRoot, 'skills'),
  process.env['SYMPHONY_LEGACY_SKILLS_PATH'] ?? join(configurationRoot, 'legacy-skills'),
);

const loadedSettings = settingsRepository.load(defaultSettings);

const settingsState = new OrchestratorSettingsState(
  settingsRepository,
  upgradeApplicationSettings(loadedSettings),
);
const workspacePaths = createWorkspacePaths({
  settingsState: settingsState,
  configurationRoot: configurationRoot,
});
const aiProfiles = createAiProfilePaths({
  configurationRoot: configurationRoot,
});

const loadedWorkflowVersion =
  typeof loadedSettings === 'object' && loadedSettings !== null
    ? (loadedSettings as { workflow?: { version?: unknown } }).workflow?.version
    : undefined;

const loadedCustomMemoryGiB =
  typeof loadedSettings === 'object' && loadedSettings !== null
    ? (loadedSettings as { localCi?: { customResources?: { memoryGiB?: unknown } } }).localCi
        ?.customResources?.memoryGiB
    : undefined;

if (
  typeof loadedSettings === 'object' &&
  loadedSettings !== null &&
  ((loadedSettings as { version?: unknown }).version === 2 ||
    loadedWorkflowVersion !== settingsState.current.workflow.version ||
    (typeof loadedCustomMemoryGiB === 'number' &&
      loadedCustomMemoryGiB !== settingsState.current.localCi.customResources?.memoryGiB))
) {
  settingsState.save(settingsState.current);
}

const isolatedSettings = aiProfiles.isolateLegacyCodexCredentials(settingsState.current);

if (isolatedSettings !== settingsState.current)
  settingsState.current = settingsState.save(isolatedSettings);

const usesSimulatedHostCapacity = process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated';

const storageGovernor = new StorageGovernor({
  configurationRoot,
  browserDataRoot: process.env['SYMPHONY_BROWSER_DATA_PATH'],
  settings: () => settingsState.current,
  ...(usesSimulatedHostCapacity
    ? {
        availableFilesystemBytes: () => 100 * 1024 ** 3,
        availableParallelism: () => 10,
        totalMemoryBytes: () => 32 * 1024 ** 3,
      }
    : {}),
});

if (!settingsState.hasStoredSettings()) settingsState.save(settingsState.current);

workspacePaths.ensureWorkspaceRoot(settingsState.current.runtime.workspaceRoot);

const workspaceStorage = {
  workspaceIds: () => settingsState.current.workspaces.map((workspace) => workspace.id),
  databasePath: (workspaceId: string) =>
    join(
      configurationRoot,
      'workspaces',
      workspaceStorageDirectoryName(workspaceId),
      'state.sqlite',
    ),
};

const workspaceDatabases = new WorkspaceDatabaseRegistry(workspaceStorage);

const legacyDatabase = new SqliteDatabase(databasePath);

const operationalRepositories = new WorkspaceOperationalRepositories({
  ...workspaceStorage,
  registry: workspaceDatabases,
  legacy: new SqliteOperationalRepositories(legacyDatabase),
});

workspaceDatabases.addSchema(agentRouteTelemetrySchema);

const routeTelemetryRepository = new WorkspaceAgentRouteTelemetryRepository(workspaceDatabases);

const runtimeRepositories = new WorkspaceRuntimeRepositories({
  ...workspaceStorage,
  registry: workspaceDatabases,
  workspaceForRepository: (repositoryBindingId) =>
    settingsState.current.repositoryBindings.find(
      (candidate) => candidate.id === repositoryBindingId,
    )?.workspaceId,
});

operationalRepositories.initialize();

const repository = operationalRepositories.execution;

const workflowRepository = operationalRepositories.workflow;

const automationRepository = operationalRepositories.automation;

routeTelemetryRepository.initialize();

const agentRouteGovernor = new AgentRouteGovernor(routeTelemetryRepository, {
  onPersistenceError: (cause) =>
    logger.error({
      event: 'agent-route-telemetry.persistence-failed',
      error: cause instanceof Error ? cause.message : String(cause),
    }),
});

const agentAccountCooldowns = new AgentAccountCooldowns(routeTelemetryRepository, {
  onPersistenceError: (cause) =>
    logger.error({
      event: 'agent-account-cooldown.persistence-failed',
      error: cause instanceof Error ? cause.message : String(cause),
    }),
});

runtimeRepositories.initialize();

const workflowStageHistory = new WorkflowStageHistoryService({
  repository: workflowRepository,
  clock: { now: () => new Date().toISOString() },
});

const ciRunHistory = new CiRunHistoryService({
  repository: runtimeRepositories.ciRunHistory,
  clock: { now: () => new Date().toISOString() },
  reportRecordFailure: (cause) =>
    logger.error({
      event: 'ci-run-history.record-failed',
      error: cause instanceof Error ? cause.message : 'Unknown run-history persistence error',
    }),
});

const remoteProjectionCache = new SqliteRemoteProjectionCache(legacyDatabase);

remoteProjectionCache.initialize();

process.once('exit', () => {
  workspaceDatabases.close();
  legacyDatabase.close();
});

chmodSync(databasePath, 0o600);

logger.info({
  event: 'orchestrator.started',
  databasePath,
  settingsPath,
  targetProjectCount: bootstrapConfig.targetProjects.length,
});

const simulatedProjects = new SimulatedProjectQueries(() => settingsState.current);
const simulatedAuthoring = new SimulatedPullRequestAuthoring(() => settingsState.current);
const simulatedCi = new SimulatedCiQueries(
  () => settingsState.current,
  () => runtimeRepositories.localCi.listLocalCiExecutions(),
);
const skillPackages = new SkillCatalogService({
  packages: skillPackageStorage,
  repositorySkillRoot: (workspaceId) => skillRoots.activeRepositorySkillRoot(workspaceId),
  assignmentsFor: (workspaceId) =>
    agentTeamFor(settingsState.current, workspaceId)?.assignments ?? [],
  customizations: () => settingsState.current.skillCustomizations,
  saveCustomizations: (skillCustomizations) => {
    settingsState.current = settingsState.save({ ...settingsState.current, skillCustomizations });
  },
  clock: { now: () => new Date().toISOString() },
  digest: sha256SkillText,
});
const skillsFeature = provideSkillsOrchestratorFeature({
  skillPackages: skillPackages,
  settingsState: settingsState,
});

const catalog: OrchestratorCatalog = {
  async health(): Promise<IRuntimeHealth> {
    return readRuntimeHealth(settingsState, Boolean(parentPort));
  },
  workflow: () => settingsState.current.workflow,
  skills: (workspaceId?: string) => skillPackages.skills(workspaceId),
  skill: (role, workspaceId) => skillPackages.skill(role, workspaceId),
  analysisSkill: (workspaceId) => skillPackages.analysisSkill(workspaceId),
  solutionSkill: (workspaceId) => skillPackages.solutionSkill(workspaceId),
  issueCreatorSkill: (workspaceId) => skillPackages.issueCreatorSkill(workspaceId),
};

const eventPublisher = createExecutionEventPublisher({
  parentPort: parentPort,
  mobileGateway: {
    broadcastSnapshotInvalidated: () => mobileRuntime.mobileGateway.broadcastSnapshotInvalidated(),
  },
});

const configuredAgentStepDelay = Number(process.env['SYMPHONY_SIMULATED_AGENT_STEP_DELAY_MS']);

const simulatedAgentStepDelay = Number.isFinite(configuredAgentStepDelay)
  ? Math.min(5_000, Math.max(50, configuredAgentStepDelay))
  : 280;

const configuredAdditionalWorkItems = Number(
  process.env['SYMPHONY_SIMULATED_ADDITIONAL_WORK_ITEMS'],
);

const simulatedAdditionalWorkItems = Number.isInteger(configuredAdditionalWorkItems)
  ? Math.min(2000, Math.max(0, configuredAdditionalWorkItems))
  : 0;

const skillRoots = createRepositorySkillRootReader({
  settingsState: settingsState,
});

const githubRequestGovernor = new GitHubRequestGovernor(4);

const githubCredentials = createGitHubConnectionTokenReader({
  settingsState: settingsState,
});

const modelIntelligence = new ArtificialAnalysisModelIntelligence({
  apiKey: () => process.env['SYMPHONY_ARTIFICIAL_ANALYSIS_API_KEY'],
});

const azureDevOpsCredentials = new AzureDevOpsCredentialBroker(process.env, (reference) =>
  credentialBridge.requestVaultCredential(reference),
);
const credentialBridge = createCredentialBridge({
  parentPort: parentPort,
  azureDevOpsCredentials: azureDevOpsCredentials,
  startInitializedBackgroundServices: (...args) =>
    backgroundCoordinator.startInitializedBackgroundServices(...args),
});

const azureDevOpsTracker =
  process.env['SYMPHONY_TRACKER_MODE'] === 'simulated'
    ? undefined
    : new AzureDevOpsWorkTracker({
        settings: () => settingsState.current,
        credential: (connection) => azureDevOpsCredentials.resolve(connection),
      });

const githubProjectTracker =
  process.env['SYMPHONY_TRACKER_MODE'] === 'simulated'
    ? undefined
    : new GitHubProjectTracker({
        settings: () => settingsState.current,
        token: githubCredentials.readGitHubConnectionToken,
        claimLeaseMinutes: () => settingsState.current.workflow.policies.claim.leaseMinutes,
        claimHeartbeatSeconds: () => settingsState.current.workflow.policies.claim.heartbeatSeconds,
        governor: githubRequestGovernor,
        observeRateLimit: (snapshot) =>
          logger.info({ event: 'github.rate-limit.observed', ...snapshot }),
      });

const tracker =
  !githubProjectTracker || !azureDevOpsTracker
    ? new SimulatedTracker(
        simulatedAdditionalWorkItems,
        () => {
          const workspaceId = primaryWorkspace(settingsState.current)?.id ?? 'personal';
          const repository = settingsState.current.repositoryBindings.find(
            (candidate) => candidate.workspaceId === workspaceId && candidate.enabled,
          );
          return {
            workspaceId,
            sourceId:
              settingsState.current.workItemSources.find(
                (candidate) => candidate.workspaceId === workspaceId && candidate.enabled,
              )?.id ?? 'simulated',
            ...(repository ? { repositoryBindingId: repository.id } : {}),
          };
        },
        () =>
          process.env['SYMPHONY_SIMULATED_TRACKER_FAILURE'] === 'rate-limit'
            ? new RemoteProviderRateLimitError(
                'GraphQL: API rate limit exceeded for simulated user.',
              )
            : undefined,
      )
    : new WorkTrackerRouter({
        settings: () => settingsState.current,
        providers: {
          'azure-devops': azureDevOpsTracker,
          'github-projects': githubProjectTracker,
        },
      });

const workspace =
  process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated'
    ? new SimulatedWorkspace(
        (workspaceId) => workspacePaths.isolatedWorkspaceRoot(workspaceId),
        () => settingsState.current.workspaces.map((candidate) => candidate.id),
      )
    : new GitWorktreeWorkspace({
        workspaceRoot: (workspaceId) => workspacePaths.isolatedWorkspaceRoot(workspaceId),
        workspaceIds: () => settingsState.current.workspaces.map((candidate) => candidate.id),
        repository: (workItem) => {
          const repositories = repositoryBindingsFor(settingsState.current, workItem);
          if (repositories.length > 1) {
            throw new Error(`Choose one repository for ${workItem.externalId} before execution.`);
          }
          return repositories[0];
        },
      });

const agentModelLockout = new AgentModelLockout({
  onInspectionError: (cause) =>
    logger.error({
      event: 'agent-model-availability.inspection-failed',
      error: cause instanceof Error ? cause.message : String(cause),
    }),
});
const aiFeature = provideAiOrchestratorFeature({
  synapseAi: synapseAi,
  settingsState: settingsState,
  modelIntelligence: modelIntelligence,
  agentModelLockout: agentModelLockout,
  agentAccountCooldowns: agentAccountCooldowns,
  isolatedRuntimeHome: (...args) => aiProfiles.isolatedRuntimeHome(...args),
  logger: logger,
});

const agent =
  process.env['SYMPHONY_AGENT_MODE'] === 'simulated'
    ? new SimulatedAgentRuntime(simulatedAgentStepDelay)
    : new WorkspaceAgentRuntime({
        governor: agentRouteGovernor,
        accountCooldowns: agentAccountCooldowns,
        modelLockout: agentModelLockout,
        targets: aiFeature.targets,
      });

const workItemWorkingDirectory = createWorkItemWorkingDirectory(settingsState);
const workItemRelationAssessor = new WorkItemRelationAssessor({
  agent,
  catalog,
  clock: { now: () => new Date().toISOString() },
  workingDirectory: workItemWorkingDirectory,
  reportFailure: (cause) =>
    logger.error({
      event: 'work-item-relation-assessment.failed',
      error: cause instanceof Error ? cause.message : String(cause),
    }),
});

const managedLocalCiRunner = new ManagedLimaGithubRunner();

const runnerImageCatalog = new RunnerImageCatalogService({
  token: async () => {
    const connection = settingsState.current.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.kind === 'github',
    );
    return connection
      ? readGitHubToken(connection.hostname, connection.accountLogin).catch(() => undefined)
      : undefined;
  },
});

const githubServiceStatus = new GitHubServiceStatusProvider();

const github = new GitHubCloudProvider({
  settings: () => settingsState.current,
  token: githubCredentials.readGitHubConnectionToken,
  governor: githubRequestGovernor,
  localRunner: managedLocalCiRunner,
  localCiGuest: (repositoryBindingId, signal) =>
    localCiRequests.resolveManagedGuest(repositoryBindingId, signal),
});

const managedRepositories = new ManagedGitRepository({
  token: async (repositoryBinding) => {
    const connection = settingsState.current.connections.find(
      (candidate): candidate is Extract<ProviderConnection, { kind: 'github' }> =>
        candidate.kind === 'github' &&
        candidate.id === repositoryBinding.sourceControlConnectionId &&
        candidate.workspaceId === repositoryBinding.workspaceId,
    );
    return connection ? githubCredentials.readGitHubConnectionToken(connection) : undefined;
  },
});

const implementationVerificationPlanner = new ManifestVerificationPlanner();

const implementationVerificationExecutor = new LocalVerificationExecutor({
  cacheRoot: toolchainCacheRoot,
});

const implementationVerification = createImplementationVerification({
  settingsState,
  configurationRoot,
  implementationVerificationPlanner,
  implementationVerificationExecutor,
});
const repositoryRuntime = new RepositoryRuntimeService({
  settings: () => settingsState.current,
  saveRepositoryPath: async (repositoryBindingId, path) => {
    settingsState.current = settingsState.save({
      ...settingsState.current,
      repositoryBindings: settingsState.current.repositoryBindings.map((repositoryBinding) =>
        repositoryBinding.id === repositoryBindingId
          ? { ...repositoryBinding, localPath: path }
          : repositoryBinding,
      ),
    });
  },
  managedRepositoryRoot: (workspaceId) =>
    join(
      configurationRoot,
      'workspaces',
      workspaceStorageDirectoryName(workspaceId),
      'repositories',
    ),
  verificationRuntimeRoot: (workspaceId, runId) =>
    join(
      configurationRoot,
      'workspaces',
      workspaceStorageDirectoryName(workspaceId),
      'verification',
      runId,
    ),
  acquisition:
    process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated'
      ? new SimulatedRepositoryAcquisition()
      : managedRepositories,
  verificationWorkspace: workspace,
  planner: implementationVerificationPlanner,
  executor: implementationVerificationExecutor,
  trust: runtimeRepositories.trust,
  verification: runtimeRepositories.verification,
  clock: { now: () => new Date().toISOString() },
  ids: { next: (prefix) => `${prefix}-${randomUUID()}` },
});

const workflowEngine = new WorkflowEngineService({
  workflow: () => settingsState.current.workflow,
  records: workflowRepository,
  tracker,
  clock: { now: () => new Date().toISOString() },
  ids: { next: (prefix) => `${prefix}-${randomUUID()}` },
  owner: () => hostname() || 'symphony-desktop',
  workItemChanged: (workItem) => service.recordWorkItem(workItem),
  capacityAvailable: () => {
    const active = repository
      .listExecutions()
      .filter(
        (execution) =>
          (execution.state === 'queued' ||
            execution.state === 'running' ||
            execution.state === 'waiting') &&
          execution.pause?.reason !== 'operator',
      ).length;
    // The starting run reserved its slot before claiming, so the slot it holds counts as free.
    return active <= Math.max(1, settingsState.current.runtime.maxParallelExecutions);
  },
});

const simulatedPullRequestDelivery =
  process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated' ||
  process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated'
    ? new SimulatedPullRequestDelivery(process.env['SYMPHONY_SIMULATED_PR_BASE_STATUS'])
    : undefined;

const delivery =
  process.env['SYMPHONY_WORKSPACE_MODE'] === 'simulated' && simulatedPullRequestDelivery
    ? simulatedPullRequestDelivery
    : github;

const workflowReporter: IWorkflowReporter = {
  runStarted: (item, role, runId) => {
    workflowEngine.runStarted(
      item,
      role,
      runId,
      builtinSkill(role).version,
      builtinSkill(role).promptVersion,
    );
  },
  applyRunResult: (item, result) => workflowEngine.applyRunResult(item, result),
  applyClaim: (item, role, runId, claim) => workflowEngine.applyClaim(item, role, runId, claim),
};

const pullRequestCollection: IPullRequestCollectionPort = {
  listPullRequests: async () => {
    const summaries =
      process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated' && simulatedPullRequestDelivery
        ? await simulatedPullRequestDelivery.listPullRequests()
        : await github.listPullRequests();
    const qualifications = new Map(
      automation
        .listPullRequestQualifications()
        .map(
          (qualification) =>
            [
              `${qualification.workspaceId}#${qualification.pullRequestNumber}`,
              qualification.baseBranchStatus,
            ] as const,
        ),
    );
    return summaries.map((summary) => {
      if (summary.baseBranchStatus) return summary;
      const observed = qualifications.get(`${summary.workspaceId}#${summary.number}`);
      return observed ? { ...summary, baseBranchStatus: observed } : summary;
    });
  },
};

const externalWrites = new ExternalWriteService(
  new JsonExternalWriteRepository(join(configurationRoot, 'provider-writes.json'), (input) =>
    externalWriteOperationSchema.array().parse(input),
  ),
  () => new Date().toISOString(),
);

const deliveryService = new DeliveryService(
  {
    readRun: (plan, runId) => github.readDeliveryRun(plan, runId),
    preview: (targetId, ref) => github.previewDelivery(targetId, ref),
    check: (plan) => github.checkDelivery(plan),
    dispatch: (plan, operationId) => github.dispatchDelivery(plan, operationId),
    reconcile: (plan, startedAt, operationId) =>
      github.reconcileDelivery(plan, startedAt, operationId),
  },
  new JsonDeliveryOperationRepository(
    join(configurationRoot, 'delivery-operations.json'),
    (input) => deliveryOperationSchema.array().parse(input),
  ),
  () => new Date().toISOString(),
);

const projectionScope = createRemoteProjectionScope({
  settingsState: settingsState,
});
const remoteProjectionDependencies = {
  clock: { now: () => new Date().toISOString() },
  scope: projectionScope.remoteProjectionScope,
  maxAgeMilliseconds: () =>
    Math.max(1, settingsState.current.runtime.boardRefreshIntervalMinutes) * 60_000,
  reportReadFailure: (
    projection: 'work-items' | 'pull-requests' | 'ci-runs',
    cause: unknown,
    cached: boolean,
  ) =>
    logger.error({
      event: 'remote-projection.refresh-failed',
      projection,
      fallback: cached ? 'cached' : 'unavailable',
      error: cause instanceof Error ? cause.message : 'Unknown remote provider error',
    }),
  reportPersistenceFailure: (
    projection: 'work-items' | 'pull-requests' | 'ci-runs',
    operation: 'load' | 'save',
    cause: unknown,
  ) =>
    logger.error({
      event: 'remote-projection.persistence-failed',
      projection,
      operation,
      error: cause instanceof Error ? cause.message : 'Unknown projection persistence error',
    }),
};

const remoteProjectionQueries = new RemoteProjectionService({
  workTracking: new WorkTrackingProjectionService({
    ...remoteProjectionDependencies,
    tracker,
    repository: new SqliteWorkTrackingProjectionRepository(remoteProjectionCache),
  }),
  pullRequests: new PullRequestProjectionService({
    ...remoteProjectionDependencies,
    pullRequests: pullRequestCollection,
    repository: new SqlitePullRequestProjectionRepository(remoteProjectionCache),
  }),
  continuousIntegration: new ContinuousIntegrationProjectionService({
    ...remoteProjectionDependencies,
    ci: github,
    repository: new SqliteContinuousIntegrationProjectionRepository(remoteProjectionCache),
    runHistory: ciRunHistory,
  }),
  includePullRequestStatus: true,
  includeContinuousIntegrationStatus: true,
});

const executionBindings = createExecutionBindings({
  deletingWorkspaceIds: () => workspaceDeletion.deletingWorkspaceIds(),
  settingsState: settingsState,
  repository: repository,
});
const service = new AnalyzerService({
  skillTextDigest: sha256SkillText,
  remoteProjectionQueries,
  workflowReporter,
  tracker,
  coordination: tracker,
  workspace,
  agent,
  repository,
  agenticDeliveryRecovery: automationRepository,
  catalog,
  clock: { now: () => new Date().toISOString() },
  ids: { next: (prefix) => `${prefix}-${randomUUID()}` },
  retainFailedWorkspaces: () => settingsState.current.runtime.retainFailedWorkspaces,
  maximumVerificationRepairAttempts: () =>
    settingsState.current.runtime.maximumVerificationRepairAttempts,
  maxParallelExecutions: () => settingsState.current.runtime.maxParallelExecutions,
  automaticDeliveryGroupingEnabledFor: (workspaceId) =>
    settingsState.current.workspaces.find((workspace) => workspace.id === workspaceId)
      ?.automaticDeliveryGroupingEnabled ?? false,
  // A queued step is new work, so it waits while storage is under a safety stop.
  queueDrainAllowed: () => storageGovernor.report().writable,
  publish: eventPublisher.publish,
  delivery,
  bindingSnapshotFor: (workItem, role) =>
    executionBindings.resolveExecutionBindingSnapshot(workItem, role),
  goalAssignmentFor: executionBindings.goalAssignmentFor,
  positionPolicyFor: executionBindings.positionPolicyFor,
  // Simulated agent runs keep the deterministic lexical relation heuristic of the service.
  ...(process.env['SYMPHONY_AGENT_MODE'] !== 'simulated'
    ? {
        assessWorkItemRelation: (
          workItems: readonly IWorkItem[],
          revisions: Readonly<Record<string, number>>,
        ) => workItemRelationAssessor.assess(workItems, revisions),
      }
    : {}),
  verifyImplementation: implementationVerification,
  authorizeLocalExecution: (workItem, approval) =>
    repositoryRuntime.authorizeAgentExecution(workItem, approval),
});

const snapshotService = new OrchestrationSnapshotService({
  execution: service,
  remoteProjectionQueries,
  catalog,
  workflowRecords: workflowRepository,
  localCiExecutions: () => {
    const selectedWorkspaceIds = new Set(settingsState.current.activeViewScope.workspaceIds);
    return runtimeRepositories.localCi
      .listLocalCiExecutions()
      .filter((execution) => selectedWorkspaceIds.has(execution.workspaceId));
  },
});
const executionFeature = provideExecutionOrchestratorFeature({
  storageGovernor: storageGovernor,
  snapshotService: snapshotService,
  service: service,
});
const deliveryFeature = provideDeliveryOrchestratorFeature({
  settingsState: settingsState,
  service: service,
  github: github,
  simulatedPullRequestDelivery: simulatedPullRequestDelivery,
  deliveryService: deliveryService,
  snapshotService: snapshotService,

  simulatedPullRequestBranches: (...args) => simulatedAuthoring.listBranches(...args),
  simulatedPullRequestComparison: (...args) => simulatedAuthoring.compareBranches(...args),
  simulatedPullRequestCreation: (...args) => simulatedAuthoring.createPullRequest(...args),
});

const workflowMaintenance = new WorkflowMaintenanceService({
  engine: workflowEngine,
  workflow: () => settingsState.current.workflow,
  clock: { now: () => new Date().toISOString() },
  listWorkItems: () => service.listOperationalWorkItems(),
  executions: service,
  capacityAvailable: () => {
    const active = repository
      .listExecutions()
      .filter(
        (execution) =>
          (execution.state === 'queued' ||
            execution.state === 'running' ||
            execution.state === 'waiting') &&
          execution.pause?.reason !== 'operator',
      ).length;
    return active < Math.max(1, settingsState.current.runtime.maxParallelExecutions);
  },
});

const automation = new AutomationService({
  tracker,
  workflow: () => settingsState.current.workflow,
  workflowReporter,
  workflowRecord: (workItemId) => workflowEngine.record(workItemId),
  listWorkItems: () => service.listOperationalWorkItems(),
  executions: service,
  repository: automationRepository,
  executionRepository: repository,
  clock: { now: () => new Date().toISOString() },
  enabled: () => settingsState.current.runtime.automaticExecutionEnabled,
  autonomyEnabled: () => settingsState.current.runtime.autonomousExecutionEnabled,
  maxParallelExecutions: () => settingsState.current.runtime.maxParallelExecutions,
  agenticDeliveryPolicy: () => settingsState.current.runtime.agenticDelivery,
  executionQueue: {
    pending: () => service.listExecutionQueue().length,
    drain: () => service.drainExecutionQueue(),
  },
  agenticDeliveryEnabledFor: (workspaceId, repositoryBindingId) =>
    settingsState.current.ciBindings.some(
      (binding) =>
        binding.workspaceId === workspaceId &&
        binding.repositoryBindingId === repositoryBindingId &&
        binding.enabled &&
        binding.agenticDeliveryEnabled === true,
    ),
  storageAdmission: (workItem, workload) =>
    executionFeature.assertWorkItemStorage(workItem.id, workload),
  ci: github,
  delivery,
});

const automationFeature = provideAutomationOrchestratorFeature({
  settingsState: settingsState,
  automation: automation,
  logger: logger,
  service: service,
  storageGovernor: storageGovernor,
});

const workItemService = new WorkItemService({
  tracker,
  issueDrafter: agent,
  catalog,
  workingDirectory: workItemWorkingDirectory,
  workItemDetails: (workItemId) => service.loadWorkItemDetails(workItemId),
  workItemChanged: (workItem) => service.recordWorkItem(workItem),
});
const workFeature = provideWorkOrchestratorFeature({
  settingsState: settingsState,
  workItemService: workItemService,
  service: service,
  workflowEngine: workflowEngine,
  storageGovernor: storageGovernor,
  githubProjectTracker: githubProjectTracker,
  tracker: tracker,

  simulatedGitHubProjects: (...args) => simulatedProjects.listProjects(...args),
});

const feedbackIntake = new MicrosoftTeamsFeedbackIntake({
  settings: () => settingsState.current,
  credential: (source) => aiFeature.resolveEnvironmentCredential(source.credentialRef),
});

const feedbackIntakeService = new FeedbackIntakeService({
  settings: () => settingsState.current,
  intake: feedbackIntake,
  tracker,
  workItems: workItemService,
  repository: automationRepository,
  clock: { now: () => new Date().toISOString() },
});

const feedbackFeature = provideFeedbackOrchestratorFeature({
  feedbackIntake: feedbackIntake,
});
const feedbackSynchronization = createFeedbackSynchronizationCoordinator({
  settingsState: settingsState,
  feedbackIntakeService: feedbackIntakeService,
  logger: logger,
});

const verificationRequests = createVerificationRequests({
  repositoryRuntime: repositoryRuntime,
  storageGovernor: storageGovernor,
  workspaceIdForRepository: (...args) => workspacePaths.workspaceIdForRepository(...args),
});

const localCiRequests = createManagedLocalCiRequests({
  logger: logger,
  storageGovernor: storageGovernor,
  github: github,
  settingsState: settingsState,
  localCiRepository: runtimeRepositories.localCi,
  configurationRoot: configurationRoot,
  managedLocalCiRunner: managedLocalCiRunner,
  runnerImageCatalog: runnerImageCatalog,
  simulatedContinuousIntegration: (...args) => simulatedCi.continuousIntegration(...args),
  simulatedWorkflowDispatch: (...args) => simulatedCi.dispatchWorkflow(...args),
});

const ciFeature = provideCiOrchestratorFeature({
  settingsState: settingsState,
  runHistory: ciRunHistory,
  localCiRepository: runtimeRepositories.localCi,
  github: github,
  snapshotService: snapshotService,
  activeLocalCiRuns: () => localCiRequests.activeRuns(),
  externalWrites: externalWrites,
  localCiSetupDiagnostics: () => localCiRequests.diagnostics(),

  simulatedContinuousIntegrationUsage: (...args) => simulatedCi.readUsage(...args),
  simulatedContinuousIntegration: (...args) => simulatedCi.continuousIntegration(...args),
  simulatedWorkflowDispatch: (...args) => simulatedCi.dispatchWorkflow(...args),
  simulatedContinuousIntegrationDetails: (...args) => simulatedCi.runDetails(...args),
});

const localCiTakeover = new LocalCiTakeoverService(
  github,
  () => localCiRequests.busy(),
  () => runtimeRepositories.localCi.listLocalCiExecutions(),
  (run) => localCiRequests.startLocalCiRun(run),
  (cause) =>
    logger.error({
      event: 'local-ci.takeover.failed',
      error: cause instanceof Error ? cause.message : String(cause),
    }),
);

const workspaceDeletion = createWorkspaceDeletionCoordinator({
  settingsState: settingsState,
  workItemService: workItemService,
  service: service,
  operationalRepositories: operationalRepositories,
  agentAccountCooldowns: agentAccountCooldowns,
  agentRouteGovernor: agentRouteGovernor,
  agentModelLockout: agentModelLockout,
  runtimeRepositories: runtimeRepositories,
  remoteProjectionCache: remoteProjectionCache,
  workspaceDatabases: workspaceDatabases,
  workspaceStoragePaths: (...args) => workspacePaths.workspaceStoragePaths(...args),
  normalizeMachinePaths: (...args) => workspacePaths.normalizeMachinePaths(...args),
  ensureWorkspaceRoot: (...args) => workspacePaths.ensureWorkspaceRoot(...args),
  synchronizeRemoteAutomation: (...args) => automationFeature.synchronizeRemoteAutomation(...args),
  synchronizeFeedbackIntake: (...args) =>
    feedbackSynchronization.synchronizeFeedbackIntake(...args),
  runAutonomousCycle: (...args) => automationFeature.runAutonomousCycle(...args),
});
const workspaceFeature = provideWorkspaceOrchestratorFeature({
  service: service,
  deleteWorkspace: (...args) => workspaceDeletion.deleteWorkspace(...args),
  skillPackages: skillPackages,
  settingsState: settingsState,
  workspaceBundles: workspaceBundles,
  deletingWorkspaceIds: () => workspaceDeletion.deletingWorkspaceIds(),
  workItemService: workItemService,
  normalizeMachinePaths: (...args) => workspacePaths.normalizeMachinePaths(...args),
  ensureWorkspaceRoot: (...args) => workspacePaths.ensureWorkspaceRoot(...args),
  synchronizeRemoteAutomation: (...args) => automationFeature.synchronizeRemoteAutomation(...args),
  synchronizeFeedbackIntake: (...args) =>
    feedbackSynchronization.synchronizeFeedbackIntake(...args),
  runAutonomousCycle: (...args) => automationFeature.runAutonomousCycle(...args),
  repositoryRuntime: repositoryRuntime,
  storageGovernor: storageGovernor,
  workspaceIdForRepository: (...args) => workspacePaths.workspaceIdForRepository(...args),
});

const platformFeature = providePlatformOrchestratorFeature({
  githubServiceStatus: githubServiceStatus,
  catalog: catalog,
  storageGovernor: storageGovernor,
  settingsState: settingsState,
  azureDevOpsCredentials: azureDevOpsCredentials,
  azureDevOpsTracker: azureDevOpsTracker,
});

const workflowFeature = provideWorkflowOrchestratorFeature({
  storageGovernor: storageGovernor,
  service: service,
  workflowEngine: workflowEngine,
  settingsState: settingsState,
  stageHistory: workflowStageHistory,
});

const mobileRuntime = createMobileGateway({
  mobileAccess: mobileAccess,
  settingsState: settingsState,
  snapshotService: snapshotService,
  workItemService: workItemService,
  storageGovernor: storageGovernor,
  assertWorkItemStorage: (...args) => executionFeature.assertWorkItemStorage(...args),
  service: service,
  workflowEngine: workflowEngine,
  recordOperatorDecision: (...args) => workflowFeature.recordOperatorDecision(...args),
  logger: logger,
});
const mobileFeature = provideMobileOrchestratorFeature({
  mobileAccess: mobileAccess,
  mobileGateway: mobileRuntime.mobileGateway,
});

const lifecycleRequests = createLifecycleRequests({
  mobileGateway: mobileRuntime.mobileGateway,
  synchronizeRemoteAutomation: (...args) => automationFeature.synchronizeRemoteAutomation(...args),
  synchronizeFeedbackIntake: (...args) =>
    feedbackSynchronization.synchronizeFeedbackIntake(...args),
  service: service,
  workItemService: workItemService,
  activeVerificationRuns: () => verificationRequests.activeRuns(),
  activeLocalCiRuns: () => localCiRequests.activeRuns(),
  activeRuntimeDependencyInstallation: () => platformFeature.activeInstallation(),
});
const settingsRequests = createSettingsRequests({
  settingsState: settingsState,
  deletingWorkspaceIds: () => workspaceDeletion.deletingWorkspaceIds(),
  activeLocalCiRuns: () => localCiRequests.activeRuns(),
  localCiEnabledWorkspaceIds: (...args) => localCiRequests.localCiEnabledWorkspaceIds(...args),
  normalizeMachinePaths: (...args) => workspacePaths.normalizeMachinePaths(...args),
  ensureWorkspaceRoot: (...args) => workspacePaths.ensureWorkspaceRoot(...args),
  agentModelLockout: agentModelLockout,
  agentAccountCooldowns: agentAccountCooldowns,
  service: service,
  synchronizeRemoteAutomation: (...args) => automationFeature.synchronizeRemoteAutomation(...args),
  synchronizeFeedbackIntake: (...args) =>
    feedbackSynchronization.synchronizeFeedbackIntake(...args),
  runAutonomousCycle: (...args) => automationFeature.runAutonomousCycle(...args),
});
const compositionFeature = provideCompositionOrchestratorFeature({
  snapshotService: snapshotService,
  readNativeConnectionStatus: (...args) => aiFeature.readNativeConnectionStatus(...args),
  azureDevOpsCredentials: azureDevOpsCredentials,
  settingsState: settingsState,
  github: github,
});
const storageSafetyCoordinator = createStorageSafetyCoordinator({
  storageGovernor: storageGovernor,
  service: service,
  logger: logger,
  workItemService: workItemService,
  activeVerificationRuns: () => verificationRequests.activeRuns(),
  activeLocalCiRuns: () => localCiRequests.activeRuns(),
});
const backgroundCoordinator = createBackgroundCoordinator({
  logger: logger,
  synchronizeRemoteAutomation: (...args) => automationFeature.synchronizeRemoteAutomation(...args),
  synchronizeFeedbackIntake: (...args) =>
    feedbackSynchronization.synchronizeFeedbackIntake(...args),
  runAutonomousCycle: (...args) => automationFeature.runAutonomousCycle(...args),
  workflowMaintenance: workflowMaintenance,
  localCiTakeover: localCiTakeover,
  service: service,
  settingsState: settingsState,
  enforceStorageSafety: (...args) => storageSafetyCoordinator.enforceStorageSafety(...args),
  prepareLocalCiRuntime: (...args) => localCiRequests.prepareLocalCiRuntime(...args),
  mobileGateway: mobileRuntime.mobileGateway,
});
const requestRegistry = new OrchestratorRequestRegistry(orchestratorFeatureMethods);
requestRegistry.register(executionFeature);
requestRegistry.register(workFeature);
requestRegistry.register(deliveryFeature);
requestRegistry.register({
  ...ciFeature,
  handlers: Object.freeze([
    ...verificationRequests.handlers,
    ...localCiRequests.handlers,
    ...ciFeature.handlers,
  ]),
});
requestRegistry.register(automationFeature);
requestRegistry.register(feedbackFeature);
requestRegistry.register(workflowFeature);
requestRegistry.register(skillsFeature);
requestRegistry.register(mobileFeature);
requestRegistry.register(workspaceFeature);
requestRegistry.register(aiFeature);
requestRegistry.register(platformFeature);
requestRegistry.register({
  ...compositionFeature,
  handlers: Object.freeze([
    ...lifecycleRequests.handlers,
    ...settingsRequests.handlers,
    ...compositionFeature.handlers,
  ]),
});
requestRegistry.seal();

const requestProcessor = new OrchestratorRequestProcessor({
  registry: requestRegistry,
  logger,
  beforeDispatch: (method) => {
    if (method !== 'settings.save' && workspaceDeletion.deletingWorkspaceIds().size === 0)
      settingsState.refresh();
  },
  postMessage: (message) => parentPort?.postMessage(message),
});

if (parentPort) {
  parentPort.on('message', ({ data }) => {
    const credentialMessage = internalCredentialMessageSchema.safeParse(data);
    if (credentialMessage.success) {
      credentialBridge.handleInternalCredentialMessage(credentialMessage.data);
      return;
    }
    void requestProcessor.handleMessage(data);
  });
  parentPort.postMessage({ type: 'orchestrator.ready' });
  const mobileNetworkTimer = setInterval(() => {
    void mobileRuntime.mobileGateway.reconcile().catch(() => undefined);
  }, 5_000);
  mobileNetworkTimer.unref();
} else {
  const snapshot = await snapshotService.snapshot();
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}
