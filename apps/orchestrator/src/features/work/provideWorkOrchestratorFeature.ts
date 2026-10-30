// #region Imports
import { suggestStageId } from '@symphony/domain-work';
import { type IProvideWorkOrchestratorFeatureDependencies } from './IProvideWorkOrchestratorFeatureDependencies';
import { workRequestSchemas, workResponseSchemas } from '@symphony/ipc-contracts-work';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns work commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideWorkOrchestratorFeature(
  dependencies: IProvideWorkOrchestratorFeatureDependencies,
) {
  const {
    settingsState,
    workItemService,
    service,
    workflowEngine,
    storageGovernor,
    githubProjectTracker,
    tracker,
    simulatedGitHubProjects,
  } = dependencies;
  function errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'work-items.metadata',
      workRequestSchemas['work-items.metadata'],
      workResponseSchemas['work-items.metadata'],
      async (input) => {
        return workItemService.metadata(input.repository, input.workspaceId, input.sourceId);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.detail',
      workRequestSchemas['work-items.detail'],
      workResponseSchemas['work-items.detail'],
      async (input) => {
        return service.loadWorkItemDetails(input.workItemId);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.create',
      workRequestSchemas['work-items.create'],
      workResponseSchemas['work-items.create'],
      async (input) => {
        return workItemService.create(input.item);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.update',
      workRequestSchemas['work-items.update'],
      workResponseSchemas['work-items.update'],
      async (input) => {
        return workItemService.update(input.workItemId, input.item);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.move',
      workRequestSchemas['work-items.move'],
      workResponseSchemas['work-items.move'],
      async (input) => {
        const moved = await workItemService.move(input.workItemId, input.boardColumnId);
        workflowEngine.adoptOperatorStage(
          moved,
          settingsState.current.user.displayName || 'operator',
        );
        return moved;
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.comment',
      workRequestSchemas['work-items.comment'],
      workResponseSchemas['work-items.comment'],
      async (input) => {
        return workItemService.comment(input.workItemId, input.body);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.draft',
      workRequestSchemas['work-items.draft'],
      workResponseSchemas['work-items.draft'],
      async (input) => {
        storageGovernor.assertWritable({ workspaceId: input.workspaceId });
        return workItemService.draft(input);
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.draft.cancel',
      workRequestSchemas['work-items.draft.cancel'],
      workResponseSchemas['work-items.draft.cancel'],
      async (input) => {
        return { cancelled: workItemService.cancelDraft(input.operationId) };
      },
    ),
    createOrchestratorRequestHandler(
      'github.projects.list',
      workRequestSchemas['github.projects.list'],
      workResponseSchemas['github.projects.list'],
      async (input) => {
        if (!githubProjectTracker) return simulatedGitHubProjects(input.workspaceId);
        try {
          return {
            projects: input.draftSettings
              ? await githubProjectTracker.listDraftProjects(
                  input.draftSettings,
                  input.workspaceId,
                  input.connectionId,
                )
              : await githubProjectTracker.listProjects(input.workspaceId, input.connectionId),
          };
        } catch (cause) {
          return { projects: [], error: errorMessage(cause) };
        }
      },
    ),
    createOrchestratorRequestHandler(
      'work-item-sources.columns',
      workRequestSchemas['work-item-sources.columns'],
      workResponseSchemas['work-item-sources.columns'],
      async (input) => {
        try {
          if (!tracker.listSourceColumns) throw new Error('The tracker cannot read board columns.');
          const columns = await tracker.listSourceColumns(input.source);
          // Providers report columns; only the orchestrator knows the configured stages, so the
          // mapping suggestion is added here instead of inside each adapter.
          const stages = settingsState.current.workflow.stages;
          return {
            columns: columns.map((column) => {
              const suggested = suggestStageId(column.label, stages);
              return suggested ? { ...column, suggestedStageId: suggested } : column;
            }),
          };
        } catch (cause) {
          return { columns: [], error: errorMessage(cause) };
        }
      },
    ),
  ]);
  return Object.freeze({ id: 'work', handlers });
}
