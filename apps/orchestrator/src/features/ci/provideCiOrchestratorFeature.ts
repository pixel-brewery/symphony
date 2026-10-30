// #region Imports
import { createHash } from 'node:crypto';
import { type ICiRunDetails } from '@symphony/domain-ci';
import { type IProvideCiOrchestratorFeatureDependencies } from './IProvideCiOrchestratorFeatureDependencies';
import { ciRequestSchemas, ciResponseSchemas } from '@symphony/ipc-contracts-ci';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns ci commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideCiOrchestratorFeature(
  dependencies: IProvideCiOrchestratorFeatureDependencies,
) {
  const {
    localCiRepository,
    github,
    snapshotService,
    activeLocalCiRuns,
    externalWrites,
    localCiSetupDiagnostics,
    simulatedContinuousIntegrationUsage,
    simulatedContinuousIntegration,
    simulatedWorkflowDispatch,
    simulatedContinuousIntegrationDetails,
  } = dependencies;
  const writeFingerprint = (input: unknown): string =>
    createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'ci.usage.get',
      ciRequestSchemas['ci.usage.get'],
      ciResponseSchemas['ci.usage.get'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedContinuousIntegrationUsage(input.repositoryBindingIds);
        }
        return github.readUsage(input.repositoryBindingIds);
      },
    ),
    createOrchestratorRequestHandler(
      'ci.runs.refresh',
      ciRequestSchemas['ci.runs.refresh'],
      ciResponseSchemas['ci.runs.refresh'],
      async (input) => {
        const result =
          process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated'
            ? simulatedContinuousIntegration()
            : await snapshotService.refreshContinuousIntegration(input.includeWorkflowCatalog);
        const activeLocalCiRun = activeLocalCiRuns().entries().next().value;
        return {
          ...result,
          ...(activeLocalCiRun
            ? {
                activeLocalCiRun: {
                  runId: activeLocalCiRun[0],
                  startedAt: activeLocalCiRun[1].startedAt,
                },
              }
            : {}),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'ci.workflow.dispatch',
      ciRequestSchemas['ci.workflow.dispatch'],
      ciResponseSchemas['ci.workflow.dispatch'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedWorkflowDispatch(input.workflowId, input.ref);
        }
        const operationInput = await github.workflowOperationInput(input.workflowId, input.ref);
        const inputs = {
          ...input.inputs,
          ...(operationInput ? { [operationInput]: 'symphony-operation-preview' } : {}),
        };
        const result = await externalWrites.execute(
          {
            kind: 'workflow-dispatch',
            scope: `workflow:${input.workflowId}`,
            fingerprint: writeFingerprint(input),
          },
          () => github.checkWorkflowDispatch(input.workflowId, input.ref, inputs),
          (operationId) =>
            github.dispatchWorkflow(input.workflowId, input.ref, {
              inputs: { ...inputs, ...(operationInput ? { [operationInput]: operationId } : {}) },
              requireProof: true,
              ...(operationInput ? { correlationId: operationId } : {}),
            }),
          (run) => github.readKnownRun(run.id),
          (operation) =>
            github.reconcileWorkflowDispatch(input.workflowId, operation.id, operation.startedAt),
        );
        if (!result) throw new Error('The workflow dispatch has no confirmed run.');
        return result;
      },
    ),
    createOrchestratorRequestHandler(
      'ci.approval.review',
      ciRequestSchemas['ci.approval.review'],
      ciResponseSchemas['ci.approval.review'],
      async (input) => {
        await externalWrites.execute(
          {
            kind: 'approval',
            scope: `approval:${input.runId}:${[...input.environmentIds].sort().join(',')}`,
            fingerprint: writeFingerprint({ revision: input.revision, decision: input.decision }),
          },
          () => github.checkPendingApproval(input.runId, input.revision, input.environmentIds),
          (operationId) =>
            github.reviewPendingApprovals(
              input.runId,
              input.revision,
              input.environmentIds,
              input.decision,
              input.comment + `\n[Symphony operation ${operationId}]`,
            ),
          (run) => github.readKnownRun(run.id),
          async (operation) =>
            (await github.hasApprovalReceipt(input.runId, operation.id, input.environmentIds))
              ? true
              : undefined,
        );
        return { completed: true as const };
      },
    ),
    createOrchestratorRequestHandler(
      'ci.run.details',
      ciRequestSchemas['ci.run.details'],
      ciResponseSchemas['ci.run.details'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return simulatedContinuousIntegrationDetails(input.runId);
        }
        const setupDiagnostics = localCiSetupDiagnostics().get(input.runId);
        const localExecution = activeLocalCiRuns().has(input.runId)
          ? undefined
          : localCiRepository
              .listLocalCiExecutions()
              .find((execution) => execution.ciRunId === input.runId);
        let details: ICiRunDetails;
        try {
          details = await github.getRunDetails(input.runId);
        } catch (cause) {
          if (!setupDiagnostics && !localExecution) throw cause;
          return {
            runId: input.runId,
            jobs: [],
            ...(localExecution?.failureLog ? { failureLog: localExecution.failureLog } : {}),
            ...(setupDiagnostics || localExecution?.localDiagnostics
              ? { localDiagnostics: setupDiagnostics ?? localExecution?.localDiagnostics }
              : {}),
          };
        }
        return {
          ...details,
          ...(details.failureLog || !localExecution?.failureLog
            ? {}
            : { failureLog: localExecution.failureLog }),
          ...(setupDiagnostics || details.localDiagnostics || localExecution?.localDiagnostics
            ? {
                localDiagnostics:
                  setupDiagnostics ?? details.localDiagnostics ?? localExecution?.localDiagnostics,
              }
            : {}),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'ci.run.log',
      ciRequestSchemas['ci.run.log'],
      ciResponseSchemas['ci.run.log'],
      async (input) => {
        if (process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated') {
          return {
            runId: input.runId,
            kind: input.kind,
            offset: input.offset,
            content: '',
            nextOffset: input.offset,
            complete: true,
          };
        }
        return github.getRunLogChunk(input.runId, input.kind, input.offset);
      },
    ),
    createOrchestratorRequestHandler(
      'ci.cancel',
      ciRequestSchemas['ci.cancel'],
      ciResponseSchemas['ci.cancel'],
      async (input) => {
        await github.cancelRun(input.runId);
        return { completed: true as const };
      },
    ),
    createOrchestratorRequestHandler(
      'ci.rerun',
      ciRequestSchemas['ci.rerun'],
      ciResponseSchemas['ci.rerun'],
      async (input) => {
        await github.rerun(input.runId);
        return { completed: true as const };
      },
    ),
  ]);
  return Object.freeze({
    id: 'ci',
    handlers,
    simulatedContinuousIntegration,
    simulatedWorkflowDispatch,
  });
}
