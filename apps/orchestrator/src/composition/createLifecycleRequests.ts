// #region Imports
import { type ICreateLifecycleRequestsDependencies } from './ICreateLifecycleRequestsDependencies';
import { requestSchemas, responseSchemas } from '@symphony/ipc-contracts-composition';
import { createOrchestratorRequestHandler } from '../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns lifecycle commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createLifecycleRequests(dependencies: ICreateLifecycleRequestsDependencies) {
  const {
    mobileGateway,
    synchronizeRemoteAutomation,
    synchronizeFeedbackIntake,
    service,
    workItemService,
    activeVerificationRuns,
    activeLocalCiRuns,
    activeRuntimeDependencyInstallation,
  } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'lifecycle.reconcile',
      requestSchemas['lifecycle.reconcile'],
      responseSchemas['lifecycle.reconcile'],
      async () => {
        await mobileGateway.reconcile();
        await synchronizeRemoteAutomation(true);
        await synchronizeFeedbackIntake(true);
        return {
          reactivated:
            (await service.reconcileActiveExecutions()) + workItemService.reactivateActiveDrafts(),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'lifecycle.active-operations.get',
      requestSchemas['lifecycle.active-operations.get'],
      responseSchemas['lifecycle.active-operations.get'],
      async () => {
        const runtimeDependencyInstallation = activeRuntimeDependencyInstallation();
        return {
          executions: service.activeExecutionRecords().map((execution) => ({
            id: execution.id,
            workItemId: execution.workItemId,
            kind: execution.kind ?? 'analysis',
          })),
          issueDrafts: workItemService.activeDraftOperations(),
          verifications: [...activeVerificationRuns().keys()].map((repositoryBindingId) => ({
            repositoryBindingId,
          })),
          localCiRuns: [...activeLocalCiRuns().keys()].map((runId) => ({ runId })),
          runtimeDependencyInstallations: runtimeDependencyInstallation
            ? [{ command: runtimeDependencyInstallation.command }]
            : [],
        };
      },
    ),
    createOrchestratorRequestHandler(
      'lifecycle.active-operations.pause',
      requestSchemas['lifecycle.active-operations.pause'],
      responseSchemas['lifecycle.active-operations.pause'],
      async () => {
        const executions = await service.pauseActiveExecutions();
        return { executionIds: executions.map((execution) => execution.id) };
      },
    ),
    createOrchestratorRequestHandler(
      'lifecycle.active-operations.cancel',
      requestSchemas['lifecycle.active-operations.cancel'],
      responseSchemas['lifecycle.active-operations.cancel'],
      async () => {
        const [executions, issueDraftOperationIds] = await Promise.all([
          service.cancelActiveExecutions(),
          workItemService.cancelActiveDrafts(),
        ]);
        const verificationRuns = [...activeVerificationRuns().entries()];
        const localCiRuns = [...activeLocalCiRuns().entries()];
        const runtimeDependencyInstallation = activeRuntimeDependencyInstallation();
        for (const [, operation] of verificationRuns) operation.controller.abort();
        for (const [, operation] of localCiRuns) operation.controller.abort();
        runtimeDependencyInstallation?.controller.abort();
        await Promise.allSettled([
          ...verificationRuns.map(([, operation]) => operation.completion),
          ...localCiRuns.map(([, operation]) => operation.completion),
          ...(runtimeDependencyInstallation ? [runtimeDependencyInstallation.completion] : []),
        ]);
        return {
          executionIds: executions.map((execution) => execution.id),
          issueDraftOperationIds,
          verificationRepositoryBindingIds: verificationRuns.map(
            ([repositoryBindingId]) => repositoryBindingId,
          ),
          localCiRunIds: localCiRuns.map(([runId]) => runId),
          runtimeDependencyInstallationCommands: runtimeDependencyInstallation
            ? [runtimeDependencyInstallation.command]
            : [],
        };
      },
    ),
  ]);
  return Object.freeze({ handlers });
}
