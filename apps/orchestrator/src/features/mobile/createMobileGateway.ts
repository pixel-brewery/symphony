// #region Imports
import { LocalMobileGateway } from '../../mobile-gateway';
import { projectMobileDisplaySettings } from '../../mobile-gateway/projectMobileDisplaySettings';
import { resolve } from 'node:path';
import { hostname } from 'node:os';
import {
  selectedWorkspaces,
  repositoryBindingsFor,
  primaryDeliveryContext,
} from '@symphony/configuration-composition';
import { type MobileWorkItemCreateRequest } from '@symphony/mobile-contracts';
import { type ICreateMobileGatewayDependencies } from './interfaces/ICreateMobileGatewayDependencies';
// #endregion

/**
 * Composes the existing product graph with one SDK host and its explicit seven-route adapter.
 *
 * @param dependencies - Existing product owners and initialized mobile lifecycle facade.
 * @returns The composed mobile gateway used by lifecycle and typed desktop handlers.
 * @throws An error when product configuration or SDK host construction rejects the composition.
 * @public
 */
export function createMobileGateway(dependencies: ICreateMobileGatewayDependencies) {
  const {
    mobileAccess,
    settingsState,
    snapshotService,
    workItemService,
    storageGovernor,
    assertWorkItemStorage,
    service,
    workflowEngine,
    recordOperatorDecision,
    logger,
  } = dependencies;
  const mobileGateway = new LocalMobileGateway({
    access: mobileAccess,
    reportRemoteFailure: (failure) =>
      logger.error({ event: 'mobile.transport.failed', ...failure }),
    identity: dependencies.mobileIdentity,
    recordActivity: dependencies.recordMobileActivity,
    lastSeenAt: dependencies.lastMobileActivity,
    displaySettings: () => projectMobileDisplaySettings(settingsState.current),
    assetsPath:
      process.env['SYMPHONY_MOBILE_ASSETS_PATH'] ??
      resolve(process.cwd(), 'dist', 'apps', 'mobile', 'browser'),
    desktopName: hostname() || 'Symphony Desktop',
    remoteAutomationEnabled: () => settingsState.current.runtime.automaticExecutionEnabled,
    employees: () =>
      settingsState.current.agentProfiles.filter((agent) =>
        settingsState.current.activeViewScope.workspaceIds.includes(agent.workspaceId),
      ),
    snapshot: () => snapshotService.snapshot(),
    workItemCreationContext: async (repository) => {
      const selected = selectedWorkspaces(settingsState.current);
      if (selected.length !== 1) {
        throw new Error('Select one workspace in Symphony Desktop before creating a work item.');
      }
      const workspace = selected[0]!;
      const sourceId = mobileCreationSourceId(workspace.id);
      const initialMetadata = await workItemService.metadata(undefined, workspace.id, sourceId);
      if (repository && !initialMetadata.repositories.includes(repository)) {
        throw new Error(
          'The selected repository is no longer available. Reload the work-item form.',
        );
      }
      return {
        workspaceId: workspace.id,
        workspaceName: workspace.displayName,
        metadata: repository
          ? await workItemService.metadata(repository, workspace.id, sourceId)
          : initialMetadata,
      };
    },
    createWorkItem: async (input: MobileWorkItemCreateRequest) => {
      const selected = selectedWorkspaces(settingsState.current);
      if (selected.length !== 1 || selected[0]?.id !== input.workspaceId) {
        throw new Error('The selected workspace is no longer active. Reload the work-item form.');
      }
      const sourceId = mobileCreationSourceId(input.workspaceId);
      const repositoryBindingIds = repositoryBindingsFor(settingsState.current, {
        workspaceId: input.workspaceId,
        repository: input.repository,
        repositoryBindingIds: [],
      }).map((repositoryBinding) => repositoryBinding.id);
      return workItemService.create({
        ...input,
        ...(sourceId ? { sourceId } : {}),
        repositoryBindingIds,
      });
    },
    draftIssue: (input) => {
      storageGovernor.assertWritable({ workspaceId: input.workspaceId });
      return workItemService.draft({
        ...input,
        ...(input.workspaceId && !input.sourceId
          ? { sourceId: mobileCreationSourceId(input.workspaceId) }
          : {}),
      });
    },
    cancelIssueDraft: (operationId) => workItemService.cancelDraft(operationId),
    startAnalyzer: async (workItemId, prompt, signal) => {
      await assertWorkItemStorage(workItemId, 'analysis');
      signal.throwIfAborted();
      return service.requestAnalysis(false, workItemId, prompt);
    },
    startSolver: async (workItemId, feedback, signal) => {
      await assertWorkItemStorage(workItemId, 'implementation');
      signal.throwIfAborted();
      return service.requestSolution(false, workItemId, feedback);
    },
    cancelExecution: (executionId) => service.cancelExecution(executionId),
    removeQueueEntry: (entryId) => service.removeExecutionQueueEntry(entryId),
    publishPullRequest: (executionId) => service.publishPullRequest(executionId),
    moveWorkItem: async (workItemId, boardColumnId, signal) => {
      await assertWorkItemStorage(workItemId);
      signal.throwIfAborted();
      const moved = await workItemService.move(workItemId, boardColumnId);
      workflowEngine.adoptOperatorStage(
        moved,
        settingsState.current.user.displayName || 'operator',
      );
      return moved;
    },
    decideWorkflow: async (workItemId, optionId) => {
      await recordOperatorDecision({ workItemId, optionId });
    },
    reportRequestFailure: (failure) => logger.error({ event: 'mobile.request.failed', ...failure }),
    host: process.env['SYMPHONY_MOBILE_HOST'],
    allowLoopbackForTests: process.env['SYMPHONY_MOBILE_ALLOW_TEST_LOOPBACK'] === '1',
    portStart: optionalPort('SYMPHONY_MOBILE_PORT_START'),
    portEnd: optionalPort('SYMPHONY_MOBILE_PORT_END'),
  });

  function mobileCreationSourceId(workspaceId: string): string | undefined {
    const selected = settingsState.current.workItemSources.find(
      (source) =>
        source.id === settingsState.current.activeViewScope.workItemSourceId &&
        source.enabled &&
        source.workspaceId === workspaceId,
    );
    return (
      selected?.id ??
      primaryDeliveryContext(settingsState.current, workspaceId)?.workItemSourceIds[0] ??
      settingsState.current.workItemSources.find(
        (source) => source.enabled && source.workspaceId === workspaceId,
      )?.id
    );
  }

  function optionalPort(name: string): number | undefined {
    const value = process.env[name];
    if (!value) return undefined;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error(`${name} must be a valid TCP port.`);
    }
    return port;
  }

  return Object.freeze({ mobileGateway });
}
