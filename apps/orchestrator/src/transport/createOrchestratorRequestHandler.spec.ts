// #region Imports
import { describe, expect, it } from 'vitest';
import { feedbackRequestSchemas, feedbackResponseSchemas } from '@symphony/ipc-contracts-feedback';
import { createOrchestratorRequestHandler } from './createOrchestratorRequestHandler';
// #endregion

const source = {
  id: 'feedback',
  workspaceId: 'workspace',
  displayName: 'Feedback',
  provider: 'microsoft-teams',
  tenantId: '00000000-0000-4000-8000-000000000001',
  clientId: '00000000-0000-4000-8000-000000000002',
  teamId: '00000000-0000-4000-8000-000000000003',
  channelId: 'channel',
  targetWorkItemSourceId: 'work',
  targetRepositoryBindingId: 'repository',
  enabled: true,
  credentialRef: '  env:TEAMS_TOKEN  ',
};

describe('createOrchestratorRequestHandler', () => {
  it('validates before preflight and passes normalized input without replacing the returned object', async () => {
    // arrange
    const order: string[] = [];
    const result = { status: 'completed', message: 'Verified', retained: true };
    const handler = createOrchestratorRequestHandler(
      'feedback-intake.test',
      feedbackRequestSchemas['feedback-intake.test'],
      feedbackResponseSchemas['feedback-intake.test'],
      (input) => {
        order.push(input.source.credentialRef);
        return result;
      },
    );
    // act
    const answer = await handler.execute({ source }, () => {
      order.push('preflight');
    });
    // assert
    expect(order).toEqual(['preflight', 'env:TEAMS_TOKEN']);
    expect(answer).toBe(result);
    expect(handler.requestSchema).toBe(feedbackRequestSchemas['feedback-intake.test']);
    expect(handler.responseSchema).toBe(feedbackResponseSchemas['feedback-intake.test']);
  });

  it('rejects invalid input before preflight or command effects', async () => {
    // arrange
    const effects: string[] = [];
    const handler = createOrchestratorRequestHandler(
      'feedback-intake.test',
      feedbackRequestSchemas['feedback-intake.test'],
      feedbackResponseSchemas['feedback-intake.test'],
      () => {
        effects.push('command');
        return {};
      },
    );
    // act
    const result = handler.execute({}, () => {
      effects.push('preflight');
    });
    // assert
    await expect(result).rejects.toThrow('The "feedback-intake.test" request');
    expect(effects).toEqual([]);
  });

  it('rejects a malformed command result through the original response validator', async () => {
    // arrange
    const handler = createOrchestratorRequestHandler(
      'feedback-intake.test',
      feedbackRequestSchemas['feedback-intake.test'],
      feedbackResponseSchemas['feedback-intake.test'],
      () => ({ status: 'invalid' }),
    );
    // act
    const result = handler.execute({ source }, () => undefined);
    // assert
    await expect(result).rejects.toThrow('The answer to "feedback-intake.test"');
  });
});
