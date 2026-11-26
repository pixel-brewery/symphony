// #region Imports
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { NodeRemoteSecurity } from '@pixel-brewery/remote-node/security';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalMobileGateway } from '../../mobile-gateway';
import type { ICreateMobileGatewayDependencies } from './interfaces/ICreateMobileGatewayDependencies';
import { createMobileGateway } from './createMobileGateway';
// #endregion

vi.mock('../../mobile-gateway', () => ({ LocalMobileGateway: vi.fn() }));
afterEach(() => vi.clearAllMocks());

function fixture() {
  let finishStorage!: () => void;
  const storage = new Promise<void>((resolve) => {
    finishStorage = resolve;
  });
  const admitted = new Error('The product admission boundary was reached.');
  const effect = async (): Promise<never> => {
    throw admitted;
  };
  const unused = async (): Promise<never> => {
    throw new Error('Unexpected product operation.');
  };
  const identity = { appId: 'symphony', hostId: 'test-installation' };
  const service = {
    requestAnalysis: vi.fn(effect),
    requestSolution: vi.fn(effect),
    cancelExecution: vi.fn(unused),
    removeExecutionQueueEntry: vi.fn((): never => {
      throw new Error('Unexpected queue operation.');
    }),
    publishPullRequest: vi.fn(unused),
  };
  const move = vi.fn(effect);
  const adoptOperatorStage = vi.fn();
  const assertWorkItemStorage = vi.fn(() => storage);
  const dependencies = {
    mobileAccess: new RemoteAccessService({
      identity,
      store: { load: async () => null, save: async () => undefined },
      security: new NodeRemoteSecurity(),
      clock: { now: () => Date.now() },
      capabilities: [],
    }),
    mobileIdentity: identity,
    recordMobileActivity: async () => undefined,
    lastMobileActivity: () => undefined,
    settingsState: { current: createDefaultApplicationSettings('/fixture/symphony-mobile') },
    snapshotService: { snapshot: unused },
    workItemService: {
      metadata: unused,
      create: unused,
      draft: unused,
      cancelDraft: () => false,
      move,
    },
    storageGovernor: { assertWritable: vi.fn() },
    assertWorkItemStorage,
    service,
    workflowEngine: { adoptOperatorStage },
    recordOperatorDecision: unused,
    logger: { error: vi.fn() },
  } satisfies ICreateMobileGatewayDependencies;
  createMobileGateway(dependencies);
  const callbacks = vi.mocked(LocalMobileGateway).mock.calls.at(-1)?.[0];
  if (!callbacks) throw new Error('The mobile gateway was not composed.');
  return {
    callbacks,
    finishStorage,
    admitted,
    service,
    move,
    adoptOperatorStage,
    assertWorkItemStorage,
  };
}

describe('createMobileGateway', () => {
  it.each(['analysis', 'implementation', 'move'] as const)(
    'denies %s when revocation interrupts the storage snapshot before product admission',
    async (operation) => {
      // arrange
      const value = fixture();
      const controller = new AbortController();
      const pending =
        operation === 'analysis'
          ? value.callbacks.startAnalyzer('work-item', 'Review this ticket.', controller.signal)
          : operation === 'implementation'
            ? value.callbacks.startSolver('work-item', 'Apply the feedback.', controller.signal)
            : value.callbacks.moveWorkItem('work-item', 'destination', controller.signal);
      const result = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

      // act
      controller.abort();
      value.finishStorage();
      await result;

      // assert
      expect(value.assertWorkItemStorage).toHaveBeenCalledExactlyOnceWith(
        'work-item',
        ...(operation === 'move' ? [] : [operation]),
      );
      expect(value.service.requestAnalysis).not.toHaveBeenCalled();
      expect(value.service.requestSolution).not.toHaveBeenCalled();
      expect(value.move).not.toHaveBeenCalled();
      expect(value.adoptOperatorStage).not.toHaveBeenCalled();
    },
  );

  it.each(['analysis', 'implementation', 'move'] as const)(
    'retains the existing %s admission when storage finishes without cancellation',
    async (operation) => {
      // arrange
      const value = fixture();
      const signal = new AbortController().signal;
      const pending =
        operation === 'analysis'
          ? value.callbacks.startAnalyzer('work-item', 'Review this ticket.', signal)
          : operation === 'implementation'
            ? value.callbacks.startSolver('work-item', 'Apply the feedback.', signal)
            : value.callbacks.moveWorkItem('work-item', 'destination', signal);
      const result = expect(pending).rejects.toBe(value.admitted);

      // act
      value.finishStorage();
      await result;

      // assert
      if (operation === 'analysis') {
        expect(value.service.requestAnalysis).toHaveBeenCalledExactlyOnceWith(
          false,
          'work-item',
          'Review this ticket.',
        );
      } else if (operation === 'implementation') {
        expect(value.service.requestSolution).toHaveBeenCalledExactlyOnceWith(
          false,
          'work-item',
          'Apply the feedback.',
        );
      } else {
        expect(value.move).toHaveBeenCalledExactlyOnceWith('work-item', 'destination');
      }
    },
  );
});
