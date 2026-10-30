// #region Imports
import { type ICreateStorageSafetyCoordinatorDependencies } from './ICreateStorageSafetyCoordinatorDependencies';
// #endregion

/**
 * Owns storageSafety commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createStorageSafetyCoordinator(
  dependencies: ICreateStorageSafetyCoordinatorDependencies,
) {
  const {
    storageGovernor,
    service,
    logger,
    workItemService,
    activeVerificationRuns,
    activeLocalCiRuns,
  } = dependencies;
  let storageEmergencyOperation: Promise<void> | undefined;

  function enforceStorageSafety(): Promise<void> {
    if (storageEmergencyOperation) return storageEmergencyOperation;
    const initialStatus = storageGovernor.report();
    let deliveryReserveAvailable = true;
    try {
      storageGovernor.assertWritable({ workload: 'analysis' });
    } catch {
      deliveryReserveAvailable = false;
    }
    if (initialStatus.writable && deliveryReserveAvailable) return Promise.resolve();
    const operation = (async () => {
      if (!deliveryReserveAvailable) {
        const removed = await service.cleanupReclaimableAnalysisWorkspaces();
        if (removed) storageGovernor.invalidate();
        try {
          storageGovernor.assertWritable({ workload: 'analysis' });
          logger.info({
            event: 'storage.delivery-reserve.reclaimed',
            removedAnalysisWorkspaces: removed,
          });
          return;
        } catch {
          const activeAnalyses = service
            .activeExecutionRecords()
            .filter(
              (execution) =>
                execution.kind === undefined ||
                execution.kind === 'analysis' ||
                execution.skillFlowRole === 'ci-diagnosis',
            );
          if (activeAnalyses.length) {
            await Promise.allSettled(
              activeAnalyses.map((execution) => service.cancelExecution(execution.id)),
            );
            await service.cleanupReclaimableAnalysisWorkspaces();
            storageGovernor.invalidate();
            logger.error({
              event: 'storage.delivery-reserve.protected',
              cancelledAnalyses: activeAnalyses.length,
            });
          }
        }
      }

      const status = storageGovernor.report();
      if (status.writable) return;
      const hasActiveWork =
        service.activeExecutionRecords().length > 0 ||
        workItemService.activeDraftOperations().length > 0 ||
        activeVerificationRuns().size > 0 ||
        activeLocalCiRuns().size > 0;
      if (!hasActiveWork) return;
      for (const active of activeVerificationRuns().values()) active.controller.abort();
      for (const active of activeLocalCiRuns().values()) active.controller.abort();
      await Promise.allSettled([
        service.cancelActiveExecutions(),
        workItemService.cancelActiveDrafts(),
        ...[...activeVerificationRuns().values()].map((active) => active.completion),
        ...[...activeLocalCiRuns().values()].map((active) => active.completion),
      ]);
      logger.error({
        event: 'storage.safety-stop.completed',
        globalPressure: status.global.pressure,
        filesystemPressure: status.filesystem.pressure,
        blockedWorkspaces: status.workspaces
          .filter((workspace) => workspace.pressure === 'critical')
          .map((workspace) => workspace.workspaceId),
        localCiPressure: status.localCi.pressure,
      });
    })().finally(() => {
      if (storageEmergencyOperation === operation) storageEmergencyOperation = undefined;
    });
    storageEmergencyOperation = operation;
    return operation;
  }

  return Object.freeze({ enforceStorageSafety });
}
