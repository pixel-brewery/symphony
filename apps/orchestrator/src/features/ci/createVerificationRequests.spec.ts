// #region Imports
import { describe, expect, it, vi } from 'vitest';
import { type IVerificationRun } from '@symphony/domain-ci';
import { createVerificationRequests } from './createVerificationRequests';
// #endregion

const completedRun: IVerificationRun = {
  id: 'verification-1',
  workspaceId: 'workspace',
  repositoryBindingId: 'repository',
  planId: 'plan',
  revision: 'revision',
  approval: 'once',
  state: 'cancelled',
  startedAt: '2026-10-30T08:00:00.000Z',
  finishedAt: '2026-10-30T08:01:00.000Z',
  steps: [],
};

describe('createVerificationRequests', () => {
  it('keeps one admission, refuses overlap and cancels the existing operation before releasing it', async () => {
    // arrange
    let finish: ((run: IVerificationRun) => void) | undefined;
    let signal: AbortSignal | undefined;
    const assertWritable = vi.fn();
    const requests = createVerificationRequests({
      repositoryRuntime: {
        createVerificationPlan: async () => {
          throw new Error('Unused plan operation');
        },
        runVerification: (_repository, _plan, _approval, admittedSignal) => {
          signal = admittedSignal;
          return new Promise<IVerificationRun>((resolve) => {
            finish = resolve;
          });
        },
      },
      storageGovernor: { assertWritable },
      workspaceIdForRepository: () => 'workspace',
    });
    const run = requests.handlers.find((handler) => handler.method === 'verification.run');
    const cancel = requests.handlers.find((handler) => handler.method === 'verification.cancel');
    if (!run || !cancel) throw new Error('Verification requests missing');
    const input = { repositoryBindingId: 'repository', planId: 'plan', approval: 'once' };
    // act
    const pending = run.execute(input, () => undefined);
    const admitted = requests.activeRuns().get('repository');
    await expect(run.execute(input, () => undefined)).rejects.toThrow('already running');
    await cancel.execute({ repositoryBindingId: 'repository' }, () => undefined);
    // assert
    expect(admitted?.controller.signal).toBe(signal);
    expect(signal?.aborted).toBe(true);
    expect(requests.activeRuns().get('repository')).toBe(admitted);
    expect(assertWritable).toHaveBeenCalledWith({
      workspaceId: 'workspace',
      workload: 'implementation',
    });
    if (!finish) throw new Error('Verification was not admitted');
    finish(completedRun);
    await expect(pending).resolves.toBe(completedRun);
    expect(requests.activeRuns().size).toBe(0);
  });

  it('releases a failed operation so a later verification can be admitted', async () => {
    // arrange
    let attempts = 0;
    const requests = createVerificationRequests({
      repositoryRuntime: {
        createVerificationPlan: async () => {
          throw new Error('Unused plan operation');
        },
        runVerification: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error('Runner failed');
          return completedRun;
        },
      },
      storageGovernor: { assertWritable: () => undefined },
      workspaceIdForRepository: () => 'workspace',
    });
    const handler = requests.handlers.find((entry) => entry.method === 'verification.run');
    if (!handler) throw new Error('Verification request missing');
    const input = { repositoryBindingId: 'repository', planId: 'plan', approval: 'once' };
    // act
    await expect(handler.execute(input, () => undefined)).rejects.toThrow('Runner failed');
    const result = await handler.execute(input, () => undefined);
    // assert
    expect(result).toBe(completedRun);
    expect(attempts).toBe(2);
    expect(requests.activeRuns().size).toBe(0);
  });
});
