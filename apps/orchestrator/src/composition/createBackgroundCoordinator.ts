// #region Imports
import { safeError } from '../logging/safeError';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { type ICreateBackgroundCoordinatorDependencies } from './ICreateBackgroundCoordinatorDependencies';
// #endregion

/**
 * Owns background commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createBackgroundCoordinator(
  dependencies: ICreateBackgroundCoordinatorDependencies,
) {
  const {
    logger,
    synchronizeRemoteAutomation,
    synchronizeFeedbackIntake,
    runAutonomousCycle,
    workflowMaintenance,
    localCiTakeover,
    service,
    settingsState,
    enforceStorageSafety,
    prepareLocalCiRuntime,
    mobileGateway,
  } = dependencies;
  let backgroundServicesStarted = false;

  function startInitializedBackgroundServices(): void {
    if (backgroundServicesStarted) return;
    backgroundServicesStarted = true;
    void initializeBackgroundServices()
      .catch((cause: unknown) => {
        logger.error({ event: 'background-services.start.failed', error: safeError(cause) });
      })
      .finally(startBackgroundSchedulers);
  }

  function startBackgroundSchedulers(): void {
    const automationTimer = setInterval(() => {
      void synchronizeRemoteAutomation(false);
      void synchronizeFeedbackIntake(false);
      void runAutonomousCycle(false);
      // Held workflow records resume on their own schedule, independent of the autonomy toggle:
      // a scheduled retry and a resolved blocker are workflow policy, not autonomous selection.
      void workflowMaintenance.runOnce().catch((cause) => {
        logger.error({ event: 'workflow-maintenance.failed', error: safeError(cause) });
      });
      void localCiTakeover.reconcile().catch((cause) => {
        logger.error({ event: 'local-ci.takeover.reconcile-failed', error: safeError(cause) });
      });
    }, 30_000);
    automationTimer.unref();
    // Renew shared claim leases well inside the configured lease so a healthy run is never
    // mistaken for a crashed one by another orchestrator.
    const claimTimer = setInterval(
      () => void service.renewActiveClaims().catch(() => undefined),
      Math.max(settingsState.current.workflow.policies.claim.heartbeatSeconds, 5) * 1_000,
    );
    claimTimer.unref();
    // A run that never released its claim leaves the reference behind for good, and only its
    // elapsed lease can prove it dead - so the sweep runs on a slow timer of its own instead of
    // competing with the heartbeats that keep live claims alive.
    const abandonedClaimTimer = setInterval(() => {
      void service
        .releaseAbandonedClaims()
        .then((released) => {
          if (released > 0) logger.info({ event: 'claim.abandoned-released', released });
        })
        .catch((cause) => {
          logger.error({ event: 'claim.sweep.failed', error: safeError(cause) });
        });
    }, 900_000);
    abandonedClaimTimer.unref();
    const storageTimer = setInterval(() => void enforceStorageSafety(), 5_000);
    storageTimer.unref();
    // A blocked message loop degrades everything above it - IPC responses stall, subprocess
    // pipes starve, and the failures surface as misleading provider errors far from the cause -
    // so a stall has to announce itself directly instead of hiding behind those symptoms.
    const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    eventLoopDelay.enable();
    const eventLoopTimer = setInterval(() => {
      const maximumStallMs = Math.round(eventLoopDelay.max / 1_000_000);
      if (maximumStallMs >= 1_000) {
        logger.error({
          event: 'event-loop.stalled',
          maximumStallMs,
          meanDelayMs: Math.round(eventLoopDelay.mean / 1_000_000),
        });
      }
      eventLoopDelay.reset();
    }, 30_000);
    eventLoopTimer.unref();
  }

  async function initializeBackgroundServices(): Promise<void> {
    // Every start-up step owns its own failure boundary. A start-up sequence that shares one
    // boundary lets an unrelated fault - a local CI runtime path, an unreachable tracker -
    // silently skip everything behind it, and the step it skips first is the recovery that
    // paused executions depend on.
    await startBackgroundStep('local-ci.start.failed', prepareLocalCiRuntime);
    await startBackgroundStep('local-ci.takeover.start.failed', () => localCiTakeover.reconcile());
    await startBackgroundStep('execution-recovery.start.failed', () =>
      service.recoverInterruptedExecutions(),
    );
    // Reconcile records with the board before anything schedules new work on stale state.
    await startBackgroundStep('workflow-maintenance.start.failed', () =>
      workflowMaintenance.runOnce(),
    );
    await startBackgroundStep('autonomy.start.failed', () => runAutonomousCycle(true));
    await startBackgroundStep('remote-automation.start.failed', () =>
      synchronizeRemoteAutomation(true),
    );
    await startBackgroundStep('feedback-intake.start.failed', () =>
      synchronizeFeedbackIntake(true),
    );
    await startBackgroundStep('mobile-access.start.failed', () => mobileGateway.reconcile());
  }

  async function startBackgroundStep(event: string, step: () => Promise<unknown>): Promise<void> {
    try {
      await step();
    } catch (cause) {
      logger.error({ event, error: safeError(cause) });
    }
  }

  return Object.freeze({ startInitializedBackgroundServices });
}
