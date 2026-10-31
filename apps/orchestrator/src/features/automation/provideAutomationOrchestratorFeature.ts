// #region Imports
import { GitHubRateLimitError } from '@symphony/providers-github';
import { safeError } from '../../logging/safeError';
import { type IProvideAutomationOrchestratorFeatureDependencies } from './IProvideAutomationOrchestratorFeatureDependencies';
import {
  automationRequestSchemas,
  automationResponseSchemas,
} from '@symphony/ipc-contracts-automation';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns automation commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideAutomationOrchestratorFeature(
  dependencies: IProvideAutomationOrchestratorFeatureDependencies,
) {
  const { settingsState, automation, logger, service, storageGovernor } = dependencies;
  let nextAutomationSynchronizationAt = 0;

  let automationSynchronizationOperation: Promise<void> | undefined;

  let automationSynchronizationFailureCount = 0;

  let lastAutonomousCycleAt = 0;

  let autonomousCycleOperation: Promise<void> | undefined;

  let autonomousCycleForceRequested = false;

  const AUTOMATION_FAILURE_RETRY_MILLISECONDS = 60_000;

  function synchronizeRemoteAutomation(force: boolean): Promise<void> {
    if (automationSynchronizationOperation) return automationSynchronizationOperation;
    const operation = synchronizeRemoteAutomationOnce(force).finally(() => {
      if (automationSynchronizationOperation === operation) {
        automationSynchronizationOperation = undefined;
      }
    });
    automationSynchronizationOperation = operation;
    return operation;
  }

  async function synchronizeRemoteAutomationOnce(force: boolean): Promise<void> {
    if (!settingsState.current.runtime.automaticExecutionEnabled) return;
    const now = Date.now();
    const interval =
      Math.max(1, settingsState.current.runtime.boardRefreshIntervalMinutes) * 60_000;
    if (!force && now < nextAutomationSynchronizationAt) return;
    try {
      const result = await automation.synchronize();
      automationSynchronizationFailureCount = 0;
      nextAutomationSynchronizationAt = Date.now() + interval;
      logger.info({ event: 'automation.synchronized', ...result });
    } catch (cause) {
      automationSynchronizationFailureCount += 1;
      const exponentialRetry = Math.min(
        interval,
        AUTOMATION_FAILURE_RETRY_MILLISECONDS * 2 ** (automationSynchronizationFailureCount - 1),
      );
      const rateLimitRetry =
        cause instanceof GitHubRateLimitError ? Date.parse(cause.retryAt) : Number.NaN;
      nextAutomationSynchronizationAt = Number.isFinite(rateLimitRetry)
        ? Math.max(now + AUTOMATION_FAILURE_RETRY_MILLISECONDS, rateLimitRetry)
        : now + exponentialRetry;
      logger.error({
        event: 'automation.synchronization.failed',
        error: safeError(cause),
        retryAt: new Date(nextAutomationSynchronizationAt).toISOString(),
      });
    }
  }

  function runAutonomousCycle(force: boolean): Promise<void> {
    if (autonomousCycleOperation) {
      if (force) autonomousCycleForceRequested = true;
      return autonomousCycleOperation;
    }
    const operation = drainAutonomousCycles(force).finally(() => {
      if (autonomousCycleOperation === operation) autonomousCycleOperation = undefined;
    });
    autonomousCycleOperation = operation;
    return operation;
  }

  function autonomyStatus() {
    const capacity = service.executionCapacity();
    const interval =
      Math.max(1, settingsState.current.runtime.autonomousWorkIntervalMinutes) * 60_000;
    return {
      enabled: settingsState.current.runtime.autonomousExecutionEnabled,
      ...capacity,
      ...(settingsState.current.runtime.autonomousExecutionEnabled
        ? {
            nextCycleAt: new Date(
              Math.max(Date.now(), lastAutonomousCycleAt + interval),
            ).toISOString(),
          }
        : {}),
    };
  }

  async function drainAutonomousCycles(force: boolean): Promise<void> {
    let forceNextCycle = force;
    do {
      autonomousCycleForceRequested = false;
      await runAutonomousCycleOnce(forceNextCycle);
      forceNextCycle = true;
    } while (autonomousCycleForceRequested);
  }

  async function runAutonomousCycleOnce(force: boolean): Promise<void> {
    const agenticDeliveryEnabled =
      settingsState.current.runtime.agenticDelivery.enabled &&
      settingsState.current.runtime.agenticDelivery.observeFailures;
    if (!settingsState.current.runtime.autonomousExecutionEnabled && !agenticDeliveryEnabled)
      return;
    const now = Date.now();
    const interval = settingsState.current.runtime.autonomousExecutionEnabled
      ? Math.max(1, settingsState.current.runtime.autonomousWorkIntervalMinutes) * 60_000
      : 60_000;
    if (!force && now - lastAutonomousCycleAt < interval) return;
    lastAutonomousCycleAt = now;
    try {
      storageGovernor.assertWritable();
      const result = await automation.runAutonomousCycle();
      logger.info({ event: 'automation.autonomous-cycle.completed', ...result });
    } catch (cause) {
      lastAutonomousCycleAt =
        now - interval + Math.min(interval, AUTOMATION_FAILURE_RETRY_MILLISECONDS);
      logger.error({ event: 'automation.autonomous-cycle.failed', error: safeError(cause) });
    }
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'autonomy.status.get',
      automationRequestSchemas['autonomy.status.get'],
      automationResponseSchemas['autonomy.status.get'],
      async () => {
        return autonomyStatus();
      },
    ),
    createOrchestratorRequestHandler(
      'autonomy.set-enabled',
      automationRequestSchemas['autonomy.set-enabled'],
      automationResponseSchemas['autonomy.set-enabled'],
      async (input) => {
        settingsState.current = settingsState.save({
          ...settingsState.current,
          runtime: { ...settingsState.current.runtime, autonomousExecutionEnabled: input.enabled },
        });
        if (input.enabled) void runAutonomousCycle(true);
        return autonomyStatus();
      },
    ),
  ]);
  return Object.freeze({
    id: 'automation',
    handlers,
    synchronizeRemoteAutomation,
    runAutonomousCycle,
  });
}
