// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { createBackgroundCoordinator } from './createBackgroundCoordinator';
// #endregion

afterEach(() => {
  vi.useRealTimers();
});

describe('createBackgroundCoordinator', () => {
  it('starts once in the existing order and continues recovery after unrelated startup failures', async () => {
    // arrange
    vi.useFakeTimers();
    const order: string[] = [];
    const error = vi.fn();
    const coordinator = createBackgroundCoordinator({
      logger: { info: vi.fn(), error },
      settingsState: { current: createDefaultApplicationSettings('/tmp/symphony-startup-test') },
      prepareLocalCiRuntime: async () => {
        order.push('local-ci');
        throw new Error('Local runtime unavailable');
      },
      localCiTakeover: {
        reconcile: async () => {
          order.push('takeover');
        },
      },
      service: {
        recoverInterruptedExecutions: async () => {
          order.push('recovery');
        },
        renewActiveClaims: async () => 0,
        releaseAbandonedClaims: async () => 0,
      },
      workflowMaintenance: {
        runOnce: async () => {
          order.push('workflow');
          throw new Error('Workflow unavailable');
        },
      },
      runAutonomousCycle: async () => {
        order.push('autonomy');
      },
      synchronizeRemoteAutomation: async () => {
        order.push('automation');
      },
      synchronizeFeedbackIntake: async () => {
        order.push('feedback');
      },
      mobileGateway: {
        reconcile: async () => {
          order.push('mobile');
        },
      },
      enforceStorageSafety: async () => undefined,
    });
    // act
    coordinator.startInitializedBackgroundServices();
    coordinator.startInitializedBackgroundServices();
    await vi.waitFor(() => {
      expect(order).toHaveLength(8);
    });
    // assert
    expect(order).toEqual([
      'local-ci',
      'takeover',
      'recovery',
      'workflow',
      'autonomy',
      'automation',
      'feedback',
      'mobile',
    ]);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ event: 'local-ci.start.failed' }));
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'workflow-maintenance.start.failed' }),
    );
  });
});
