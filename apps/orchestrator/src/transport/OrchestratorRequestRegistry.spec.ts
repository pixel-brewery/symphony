// #region Imports
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { feedbackRequestSchemas, feedbackResponseSchemas } from '@symphony/ipc-contracts-feedback';
import { mobileRequestSchemas, mobileResponseSchemas } from '@symphony/ipc-contracts-mobile';
import { requestSchemas } from '@symphony/ipc-contracts-composition';
import { orchestratorFeatureMethods } from '../composition/OrchestratorFeatureMethods';
import { createOrchestratorRequestHandler } from './createOrchestratorRequestHandler';
import { OrchestratorRequestRegistry } from './OrchestratorRequestRegistry';
// #endregion

const omittedExceptFeedback = Object.keys(orchestratorFeatureMethods).filter(
  (id) => id !== 'feedback',
);
function feedbackHandler() {
  return createOrchestratorRequestHandler(
    'feedback-intake.test',
    feedbackRequestSchemas['feedback-intake.test'],
    feedbackResponseSchemas['feedback-intake.test'],
    () => ({ status: 'completed', message: 'Verified' }),
  );
}

describe('OrchestratorRequestRegistry', () => {
  it('retains all 113 methods in canonical order and seals its public list', () => {
    // arrange
    const registry = new OrchestratorRequestRegistry(
      orchestratorFeatureMethods,
      omittedExceptFeedback,
    );
    registry.register({ id: 'feedback', handlers: [feedbackHandler()] });
    // act
    registry.seal();
    // assert
    expect(registry.methods).toEqual(Object.keys(requestSchemas));
    expect(registry.methods).toHaveLength(113);
    expect(Object.isFrozen(registry.methods)).toBe(true);
    expect(() => registry.register({ id: 'feedback', handlers: [] })).toThrow('sealed');
  });

  it('rejects duplicate, foreign and noncanonical handlers before registration commits', () => {
    // arrange
    const registry = new OrchestratorRequestRegistry(
      orchestratorFeatureMethods,
      omittedExceptFeedback,
    );
    const handler = feedbackHandler();
    const foreign = createOrchestratorRequestHandler(
      'mobile-access.status.get',
      mobileRequestSchemas['mobile-access.status.get'],
      mobileResponseSchemas['mobile-access.status.get'],
      () => undefined,
    );
    const noncanonical = createOrchestratorRequestHandler(
      'feedback-intake.test',
      z.object({}),
      feedbackResponseSchemas['feedback-intake.test'],
      () => undefined,
    );
    // act / assert
    expect(() => registry.register({ id: 'feedback', handlers: [handler, handler] })).toThrow(
      'Duplicate',
    );
    expect(() => registry.register({ id: 'feedback', handlers: [foreign] })).toThrow('Foreign');
    expect(() => registry.register({ id: 'feedback', handlers: [noncanonical] })).toThrow(
      'Noncanonical',
    );
    registry.register({ id: 'feedback', handlers: [handler] });
    expect(() => registry.register({ id: 'feedback', handlers: [handler] })).toThrow(
      'Duplicate orchestration feature',
    );
  });

  it('requires every enabled feature and every owned method', () => {
    // arrange
    const registry = new OrchestratorRequestRegistry(
      orchestratorFeatureMethods,
      omittedExceptFeedback,
    );
    // act / assert
    expect(() => registry.register({ id: 'feedback', handlers: [] })).toThrow(
      'Missing orchestration handler',
    );
    expect(() => registry.seal()).toThrow('Missing orchestration feature: feedback');
  });

  it('handles explicit omissions without invoking a feature', async () => {
    // arrange
    const registry = new OrchestratorRequestRegistry(
      orchestratorFeatureMethods,
      Object.keys(orchestratorFeatureMethods),
    );
    registry.seal();
    let preflight = false;
    // act
    const result = registry.execute('feedback-intake.test', {}, () => {
      preflight = true;
    });
    // assert
    await expect(result).rejects.toThrow('unavailable');
    expect(preflight).toBe(false);
  });
});
