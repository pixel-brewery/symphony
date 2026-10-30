// #region Imports
import { type IProvideExecutionOrchestratorFeatureDependencies } from './IProvideExecutionOrchestratorFeatureDependencies';
import {
  executionRequestSchemas,
  executionResponseSchemas,
} from '@symphony/ipc-contracts-execution';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns execution commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideExecutionOrchestratorFeature(
  dependencies: IProvideExecutionOrchestratorFeatureDependencies,
) {
  const { storageGovernor, snapshotService, service } = dependencies;
  async function assertWorkItemStorage(
    workItemId?: string,
    workload?: 'analysis' | 'implementation',
  ): Promise<void> {
    if (!workItemId) {
      storageGovernor.assertWritable({ workload });
      return;
    }
    const snapshot = await snapshotService.snapshot();
    const workspaceId = snapshot.workItems.find((item) => item.id === workItemId)?.workspaceId;
    storageGovernor.assertWritable({ workspaceId, workload });
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'execution-state.get',
      executionRequestSchemas['execution-state.get'],
      executionResponseSchemas['execution-state.get'],
      async () => {
        return service.executionState();
      },
    ),
    createOrchestratorRequestHandler(
      'analyzer.start',
      executionRequestSchemas['analyzer.start'],
      executionResponseSchemas['analyzer.start'],
      async (input) => {
        await assertWorkItemStorage(input.workItemId, 'analysis');
        return service.requestAnalysis(
          input.simulateFailure,
          input.workItemId,
          input.prompt,
          input.executionApproval,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'analysis.complete-manually',
      executionRequestSchemas['analysis.complete-manually'],
      executionResponseSchemas['analysis.complete-manually'],
      async (input) => {
        return service.completeManualAnalysis(input.workItemId, input.summary);
      },
    ),
    createOrchestratorRequestHandler(
      'solver.start',
      executionRequestSchemas['solver.start'],
      executionResponseSchemas['solver.start'],
      async (input) => {
        await assertWorkItemStorage(input.workItemId, 'implementation');
        return service.requestSolution(
          input.simulateFailure,
          input.workItemId,
          input.feedback,
          input.executionApproval,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'work-items.delegate',
      executionRequestSchemas['work-items.delegate'],
      executionResponseSchemas['work-items.delegate'],
      async (input) => {
        return service.delegateWorkItem(
          input.workItemId,
          input.agentTeamId,
          input.responsibleAgentId,
          input.objective,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'goals.review',
      executionRequestSchemas['goals.review'],
      executionResponseSchemas['goals.review'],
      async (input) => {
        return service.reviewGoal(input.workItemId, input.decision, input.message);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.assess',
      executionRequestSchemas['delivery-groups.assess'],
      executionResponseSchemas['delivery-groups.assess'],
      async (input) => {
        return service.assessDeliveryGroup(
          input.workItemIds,
          input.rootWorkItemId,
          input.activationSource,
          input.assessmentMode,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.create-direct',
      executionRequestSchemas['delivery-groups.create-direct'],
      executionResponseSchemas['delivery-groups.create-direct'],
      async (input) => {
        return service.groupDeliveryDirectly(
          input.workItemIds,
          input.rootWorkItemId,
          input.activationSource,
        );
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.confirm',
      executionRequestSchemas['delivery-groups.confirm'],
      executionResponseSchemas['delivery-groups.confirm'],
      async (input) => {
        return service.confirmDeliveryGroup(input.proposalId, input.attestation);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.reject',
      executionRequestSchemas['delivery-groups.reject'],
      executionResponseSchemas['delivery-groups.reject'],
      async (input) => {
        return service.rejectDeliveryGroup(input.proposalId, input.reason);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.dissolve',
      executionRequestSchemas['delivery-groups.dissolve'],
      executionResponseSchemas['delivery-groups.dissolve'],
      async (input) => {
        return service.dissolveDeliveryGroup(input.deliveryGroupId);
      },
    ),
    createOrchestratorRequestHandler(
      'delivery-groups.align',
      executionRequestSchemas['delivery-groups.align'],
      executionResponseSchemas['delivery-groups.align'],
      async (input) => {
        return service.alignDeliveryGroup(input.deliveryGroupId);
      },
    ),
    createOrchestratorRequestHandler(
      'solution.complete-manually',
      executionRequestSchemas['solution.complete-manually'],
      executionResponseSchemas['solution.complete-manually'],
      async (input) => {
        return service.completeManualSolution(input.workItemId, input.summary);
      },
    ),
    createOrchestratorRequestHandler(
      'execution-queue.remove',
      executionRequestSchemas['execution-queue.remove'],
      executionResponseSchemas['execution-queue.remove'],
      async (input) => {
        return service.removeExecutionQueueEntry(input.entryId);
      },
    ),
    createOrchestratorRequestHandler(
      'execution.cancel',
      executionRequestSchemas['execution.cancel'],
      executionResponseSchemas['execution.cancel'],
      async (input) => {
        return service.cancelExecution(input.executionId);
      },
    ),
    createOrchestratorRequestHandler(
      'execution.pause',
      executionRequestSchemas['execution.pause'],
      executionResponseSchemas['execution.pause'],
      async (input) => {
        return service.pauseExecution(input.executionId);
      },
    ),
    createOrchestratorRequestHandler(
      'execution.resume',
      executionRequestSchemas['execution.resume'],
      executionResponseSchemas['execution.resume'],
      async (input) => {
        storageGovernor.assertWritable();
        return service.resumeExecution(input.executionId);
      },
    ),
  ]);
  return Object.freeze({ id: 'execution', handlers, assertWorkItemStorage });
}
