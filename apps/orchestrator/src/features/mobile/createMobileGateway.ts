// #region Imports
import { LocalMobileGateway } from '../../mobile-gateway';
import { resolve } from 'node:path';
import { hostname } from 'node:os';
import {
  selectedWorkspaces,
  repositoryBindingsFor,
  primaryDeliveryContext,
} from '@symphony/configuration-composition';
import { type MobileWorkItemCreateRequest } from '@symphony/mobile-contracts';
import { type ICreateMobileGatewayDependencies } from './ICreateMobileGatewayDependencies';
// #endregion

/**
 * Owns mobileGateway commands and their Utility Process lifecycle state.
 *
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
    startAnalyzer: async (workItemId, prompt) => {
      await assertWorkItemStorage(workItemId, 'analysis');
      return service.requestAnalysis(false, workItemId, prompt);
    },
    startSolver: async (workItemId, feedback) => {
      await assertWorkItemStorage(workItemId, 'implementation');
      return service.requestSolution(false, workItemId, feedback);
    },
    cancelExecution: (executionId) => service.cancelExecution(executionId),
    removeQueueEntry: (entryId) => service.removeExecutionQueueEntry(entryId),
    publishPullRequest: (executionId) => service.publishPullRequest(executionId),
    moveWorkItem: async (workItemId, boardColumnId) => {
      await assertWorkItemStorage(workItemId);
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
