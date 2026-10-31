// #region Imports
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultApplicationSettings,
  type IApplicationSettings,
} from '@symphony/configuration-composition';
import { type ILocalCiExecution } from '@symphony/domain-ci';
import { type ICreateManagedLocalCiRequestsDependencies } from './ICreateManagedLocalCiRequestsDependencies';
import { createManagedLocalCiRequests } from './createManagedLocalCiRequests';
// #endregion

function localCiFixture(cleanupFails = false) {
  const defaults = createDefaultApplicationSettings('/tmp/symphony-local-ci-test');
  const first = defaults.workspaces[0];
  if (!first) throw new Error('Default workspace missing');
  const settings: IApplicationSettings = {
    ...defaults,
    workspaces: defaults.workspaces.map((workspace) => ({ ...workspace, localCiEnabled: true })),
    ciBindings: [
      {
        id: 'ci-binding',
        workspaceId: first.id,
        repositoryBindingId: 'repository',
        sourceControlConnectionId: 'connection',
        provider: 'github-actions',
        displayName: 'CI',
        enabled: true,
      },
    ],
  };
  const saved: ILocalCiExecution[] = [];
  let finish: ((execution: ILocalCiExecution) => void) | undefined;
  const runLocally: ICreateManagedLocalCiRequestsDependencies['github']['runLocally'] = () =>
    new Promise<ILocalCiExecution>((resolve) => {
      finish = resolve;
    });
  const dependencies: ICreateManagedLocalCiRequestsDependencies = {
    logger: { info: vi.fn(), error: vi.fn() },
    storageGovernor: { assertWritable: () => undefined, invalidate: () => undefined },
    github: {
      runWorkspaceId: () => first.id,
      runLocally,
      getRunDetails: async () => {
        throw new Error('No remote details');
      },
      workflowWorkspaceId: async () => first.id,
      dispatchWorkflow: async () => {
        throw new Error('Unused dispatch');
      },
    },
    settingsState: { current: settings, save: (value) => value },
    configurationRoot: '/tmp/symphony-local-ci-test',
    localCiRepository: {
      saveLocalCiExecution: (execution) => {
        saved.push(execution);
      },
      listLocalCiExecutions: () => saved,
    },
    managedLocalCiRunner: {
      cleanup: async () => ({
        removedInstances: 0,
        failedInstances: cleanupFails ? 1 : 0,
        removedConfigurationFiles: 0,
      }),
      instances: async () => [],
      removeInstance: async () => {
        throw new Error('Unused removal');
      },
    },
    runnerImageCatalog: {
      catalog: async () => {
        throw new Error('Unused catalog');
      },
      resolveDefinition: async () => {
        throw new Error('Unused image');
      },
    },
    simulatedContinuousIntegration: () => {
      throw new Error('Unused simulated query');
    },
    simulatedWorkflowDispatch: () => {
      throw new Error('Unused simulated dispatch');
    },
  };
  return {
    requests: createManagedLocalCiRequests(dependencies),
    saved,
    workspaceId: first.id,
    finish: (execution: ILocalCiExecution) => {
      if (!finish) throw new Error('Local CI was not started');
      finish(execution);
    },
  };
}

describe('createManagedLocalCiRequests', () => {
  it('keeps one run owner and refuses cleanup and overlap until cancellation completes', async () => {
    // arrange
    const fixture = localCiFixture();
    const pending = fixture.requests.startLocalCiRun({ id: 'ci-binding:1', runAttempt: 2 });
    await vi.waitFor(() => {
      expect(fixture.requests.diagnostics().size).toBe(0);
    });
    const admitted = fixture.requests.activeRuns().get('ci-binding:1');
    const cancel = fixture.requests.handlers.find(
      (handler) => handler.method === 'ci.local.cancel',
    );
    const cleanup = fixture.requests.handlers.find(
      (handler) => handler.method === 'ci.local.cleanup',
    );
    if (!cancel || !cleanup || !admitted) throw new Error('Local CI lifecycle missing');
    // act
    await expect(fixture.requests.startLocalCiRun({ id: 'ci-binding:2' })).rejects.toThrow(
      'already running locally',
    );
    await expect(cleanup.execute({}, () => undefined)).rejects.toThrow(
      'Stop the active local CI run',
    );
    await cancel.execute({ runId: 'ci-binding:1' }, () => undefined);
    // assert
    expect(admitted.controller.signal.aborted).toBe(true);
    expect(fixture.requests.busy()).toBe(true);
    fixture.finish({
      id: 'local-ci-1',
      workspaceId: fixture.workspaceId,
      repositoryBindingId: 'repository',
      ciRunId: 'ci-binding:1',
      runAttempt: 2,
      state: 'cancelled',
      startedAt: '2026-10-30T08:00:00.000Z',
      finishedAt: '2026-10-30T08:01:00.000Z',
    });
    await expect(pending).resolves.toMatchObject({ state: 'cancelled', runAttempt: 2 });
    expect(fixture.saved).toHaveLength(1);
    expect(fixture.requests.activeRuns().size).toBe(0);
    expect(fixture.requests.busy()).toBe(false);
  });

  it('retains terminal setup-failure evidence and releases the operation after cleanup fails', async () => {
    // arrange
    const fixture = localCiFixture(true);
    // act
    const result = await fixture.requests.startLocalCiRun({ id: 'ci-binding:3', runAttempt: 4 });
    // assert
    expect(result).toMatchObject({ ciRunId: 'ci-binding:3', state: 'failed', runAttempt: 4 });
    expect(result.failureLog).toContain('abandoned local CI instance');
    expect(result.localDiagnostics).toContain('Local runner setup failed');
    expect(fixture.saved).toEqual([result]);
    expect(fixture.requests.activeRuns().size).toBe(0);
    expect(fixture.requests.diagnostics().size).toBe(0);
  });
});
