// #region Imports
import { type IProvideWorkflowOrchestratorFeatureDependencies } from './IProvideWorkflowOrchestratorFeatureDependencies';
import { workflowRequestSchemas, workflowResponseSchemas } from '@symphony/ipc-contracts-workflow';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns workflow commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideWorkflowOrchestratorFeature(
  dependencies: IProvideWorkflowOrchestratorFeatureDependencies,
) {
  const { storageGovernor, service, workflowEngine, settingsState } = dependencies;
  async function recordOperatorDecision(input: {
    readonly workItemId: string;
    readonly optionId: string;
    readonly note?: string;
    readonly commitSha?: string;
  }) {
    storageGovernor.assertWritable();
    const item = await service.loadWorkItemDetails(input.workItemId);
    return workflowEngine.applyOperatorDecision(item, {
      ...input,
      decidedBy: settingsState.current.user.displayName || 'operator',
    });
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'workflow.get',
      workflowRequestSchemas['workflow.get'],
      workflowResponseSchemas['workflow.get'],
      async (input) => {
        const trail = workflowEngine.auditTrail(input.workItemId);
        return {
          record: workflowEngine.record(input.workItemId),
          audit: trail.slice(-(input.auditLimit ?? 200)),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'workflow.decide',
      workflowRequestSchemas['workflow.decide'],
      workflowResponseSchemas['workflow.decide'],
      async (input) => {
        return { record: await recordOperatorDecision(input) };
      },
    ),
    createOrchestratorRequestHandler(
      'workflow.answer',
      workflowRequestSchemas['workflow.answer'],
      workflowResponseSchemas['workflow.answer'],
      async (input) => {
        storageGovernor.assertWritable();
        const item = await service.loadWorkItemDetails(input.workItemId);
        return {
          record: workflowEngine.answerHumanRequest(item, {
            questionId: input.questionId,
            ...(input.option ? { option: input.option } : {}),
            ...(input.note ? { note: input.note } : {}),
            answeredBy: settingsState.current.user.displayName || 'operator',
          }),
        };
      },
    ),
  ]);
  return Object.freeze({ id: 'workflow', handlers, recordOperatorDecision });
}
